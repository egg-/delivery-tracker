'use strict'

var async = require('async')
var request = require('request')
var parseString = require('xml2js').parseString
var moment = require('moment')

var tracker = require('../')

var PANTOS_COURIER = {
  code: tracker.COURIER.PANTOS.CODE,
  name: tracker.COURIER.PANTOS.NAME
}

var trackingInfo = function (number) {
  return {
    summary: {
      method: 'POST',
      url: 'http://totprd.pantos.com/gsi/vm/intrnTrckgMgnt/inqNotLoginExpsTrckg.ajax',
      data: {
        quickType: 'HBL_NO',
        quickNo: number,
        searchType: ''
      }
    },
    events: {
      method: 'POST',
      url: 'http://totprd.pantos.com/gsi/vm/intrnTrckgMgnt/inqExpsTrckgEvntList.ajax',
      data: {
        hblNo: number
      }
    }
  }
}

var trackingExternalCheckpoint = function (info, cb) {
  var courier = tracker.courier(info.courier.CODE)
  courier.trace(info.number, function (err, trace) {
    if (err) {
      return cb(err)
    }
    cb(null, trace.checkpoints)
  })
}

var normalizeExternal = function (data, cb) {
  var carrCd = data.carrCd[0]
  var linkedAddr = data.linkedAddr[0]
  var expsBizTypeCode = data.expsBizTypeCode[0]
  var carrTypeCd = data.carrTypeCd[0]
  var wmDomCarr = data.wmDomCarr[0]
  var refBlNo = data.refBlNo[0]
  var trkrSvcCd = data.trkrSvcCd[0]
  var podNatnCd = data.podNatnCd[0].toUpperCase()
  var externalCourier = null
  var externalNumber = data.refBlNo[0]

  if (linkedAddr.indexOf('usps.com') !== -1) {
    externalCourier = tracker.COURIER.USPS
  } else if (['1023369', '1005928', '1122926', '2208358'].indexOf(carrCd) !== -1) {
    externalCourier = tracker.COURIER.KOREAPOST
  } else if (trkrSvcCd === 'E' && podNatnCd === 'KR') {
    // E: 우체국
    externalCourier = tracker.COURIER.KOREAPOST
  } else if (trkrSvcCd === 'K') {
    // K: 대한통운
    // @TODO
    externalCourier = ''
  } else {
    if (expsBizTypeCode === 'PX') {
      if (podNatnCd === 'GB') {
        externalCourier = tracker.COURIER.ROYALMAIL // http://www.royalmail.com/portal/rm/track?trackNumber=
      } else if (podNatnCd === 'AU') {
        externalCourier = tracker.COURIER.AUSPOST
      } else if (podNatnCd === 'JP') {
        // @TODO
        externalCourier = 'globalaccess' // https://tracking.globalaccess.com/?vendor=Pantos&ordernumber=
      } else if (podNatnCd === 'US' && carrTypeCd === 'USPS') {
        if (refBlNo.length === 22) {
          externalCourier = tracker.COURIER.USPS
        } else if (linkedAddr.indexOf('fedex.com') !== -1) {
          externalCourier = tracker.COURIER.FEDEX
        } else if (wmDomCarr === 'UPSD') {
          // @TODO
          externalCourier = 'UPS'
        }
      } else if (wmDomCarr === 'ZJS') {
        if (refBlNo.length === 10) {
          // @TODO
          externalCourier = 'ZJS' // http://www.zjs.com.cn/api/tracking.jspx?orderNos=
        } else {
          // @TODO
          externalCourier = 'HTKY' // www.htky365.com
        }
      }
    }
  }

  if (!externalCourier && externalNumber) {
    return cb(tracker.error(tracker.ERROR.NOT_SUPPORT_SHIPMENT))
  }

  cb(null, {
    courier: externalCourier,
    number: externalNumber
  })
}

var parser = {
  summary: function (body, cb) {
    parseString(body, function (err, xml) {
      if (err) {
        return cb(err)
      }

      if (xml.xsync.alert) {
        return cb(xml.xasync.alert[0])
      }

      var data = xml.xsync.LMultiData[0]

      normalizeExternal(data, function (err, external) {
        if (err) {
          return cb(err)
        }

        cb(null, {
          number: data.hblNo[0],
          external: external
        })
      })
    })
  },
  checkpoints: function (body, cb) {
    parseString(body, function (err, xml) {
      if (err) {
        return cb(err)
      }

      var data = xml.xsync.LMultiData[0]
      var checkpoints = []

      var previousTime = null
      for (var i = 0, len = data.actEvntLoclYmd.length; i < len; i++) {
        var time = moment([data.actEvntLoclYmd[i], data.actEvntLoclHm[i]].join('T'), 'YYYY-MM-DDTHH:mm')
        var checkpoint = {
          courier: PANTOS_COURIER,
          location: data.portCd[i],
          message: data.evntNm[i],
          status: tracker.STATUS.IN_TRANSIT,
          time: time.isValid() ? time.format('YYYY-MM-DDTHH:mm') : '',
          estimateTime: time.isValid() ? time.format('YYYY-MM-DDTHH:mm') : previousTime
        }

        checkpoint.message.indexOf('Pick-Up') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
        checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

        checkpoints.push(checkpoint)

        // time 값이 올바르지 않는 경우 처리.
        if (time.isValid()) {
          previousTime = time.format('YYYY-MM-DDTHH:mm')
        }
      }

      cb(null, checkpoints.reverse())
    })
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      var result = {
        courier: PANTOS_COURIER,
        number: number,
        status: tracker.STATUS.PENDING,
        checkpoints: []
      }

      async.waterfall([
        function (cb) {
          // fetch summary information
          request.post({
            url: tracking.summary.url,
            form: tracking.summary.data
          }, function (err, res, body) {
            if (err) {
              return cb(err)
            }

            parser.summary(body, cb)
          })
        },
        function (summary, cb) {
          result.number = summary.number
          if (summary.external && summary.external.number) {
            return trackingExternalCheckpoint(summary.external, function (err, checkpoints) {
              if (err) {
                return cb(err)
              }
              result.checkpoints = checkpoints
              cb()
            })
          }
          cb()
        },
        function (cb) {
          // fetch checkpoints
          request.post({
            url: tracking.events.url,
            form: tracking.events.data
          }, function (err, res, body) {
            if (err) {
              return cb(err)
            }

            parser.checkpoints(body, cb)
          })
        },
        function (checkpoints, cb) {
          if (result.checkpoints.length > 0) {
            result.checkpoints = result.checkpoints.concat(checkpoints)
            result.checkpoints.sort(function (a, b) {
              return (+new Date(b.courier.code === tracker.COURIER.PANTOS.CODE && b.time ? b.estimateTime : b.time)) - (+new Date(a.courier.code === tracker.COURIER.PANTOS.CODE && a.time ? a.estimateTime : a.time))
            })
          } else {
            result.checkpoints = checkpoints
          }
          result.status = tracker.normalizeStatus(result.checkpoints)
          cb(null, result)
        }
      ], function (err, trace) {
        if (err) {
          if (err === 'There is not data found') {
            return cb(null, result)
          }
          return cb(err)
        }

        cb(null, trace)
      })
    }
  }
}
