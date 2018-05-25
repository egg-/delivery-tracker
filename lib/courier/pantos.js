'use strict'

var async = require('async')
var request = require('request')
var moment = require('moment')

var tracker = require('../')

var PANTOS_COURIER = {
  code: tracker.COURIER.PANTOS.CODE,
  name: tracker.COURIER.PANTOS.NAME
}

var trackingInfo = function (number) {
  return {
    index: {
      url: 'http://www.epantos.com/ecp/web/pr/dt/popup/dlvChaseInqPopup.do',
      method: 'GET'
    },
    summary: {
      url: 'http://www.epantos.com/ecp/pr/dt/dlvchaseinq/retreiveTrackingList.dev',
      method: 'POST',
      json: true,
      formData: {
        _dataset_: JSON.stringify({
          IN_PARAM: {
            quickNo: [ number ],
            locale: 'en'
          }
        })
      }
    },
    checkpoints: {
      url: 'http://www.epantos.com/ecp/pr/dt/dlvchaseinq/retreiveTrackingListDtl.dev',
      method: 'POST',
      json: true,
      formData: {
        _dataset_: JSON.stringify({
          IN_PARAM: {
            hblNo: number,
            mblNo: '',
            locale: 'en',
            expsBizTypeCd: '',
            carrSprCd: null,
            wmDomCarr: null
          }
        })
      }
    }
  }
}

var parser = {
  summary: function (body) {
    var item = body.OUT_DS1[0] || {}
    return {
      number: item.hblNo
    }
  },
  checkpoints: function (body) {
    var data = body.OUT_DS1
    var checkpoints = []

    for (var i = 0, len = data.length; i < len; i++) {
      var eventCode = data[i].evntCd
      var checkpoint = {
        courier: PANTOS_COURIER,
        location: data[i].evntLocNm,
        message: data[i].evntDesc,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(data[i].eventDt, 'YYYYMMDDHHmm').format('YYYY-MM-DDTHH:mm')
      }

      if (eventCode === 'DLI') {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (eventCode === 'PKU') {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      }
      checkpoints.push(checkpoint)
    }

    return checkpoints
  },
  external: function (body) {
    var data = body.OUT_DS1[0]
    var courier = null
    var number = data.refBlNo

    if (data.expsBizTypeCd === 'PX') {
      if (data.podNatnCd === 'AU') {
        courier = tracker.COURIER.AUSPOST
      } else if (data.podNatnCd === 'US') {
        if (data.carrTypeCd === 'UPSD') {
          courier = tracker.COURIER.UPS
        } else if (number && number.length === 22) {
          courier = tracker.COURIER.USPS
        } else if (data.linkedAddr.indexOf('fedex.com') !== -1) {
          courier = tracker.COURIER.FEDEX
        }
      }
    }

    return courier && number ? {
      courier: courier,
      number: number
    } : null
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      var req = request.defaults({ jar: true })

      req(tracking.index, function () {
        async.parallel({
          summary: function (cb) {
            req(tracking.summary, function (err, res, body) {
              cb(err, body)
            })
          },
          checkpoints: function (cb) {
            req(tracking.checkpoints, function (err, req, body) {
              cb(err, body)
            })
          }
        }, function (err, data) {
          if (err) {
            return cb(err)
          }
          if (data.summary.result && data.summary.result.RESULT_CD === '-1') {
            return cb(tracker.error(tracker.ERROR.SEARCH_AGAIN))
          }
          var summary = parser.summary(data.summary)
          var external = parser.external(data.summary)
          var checkpoints = parser.checkpoints(data.checkpoints)

          var complete = function () {
            cb(null, {
              courier: PANTOS_COURIER,
              number: summary.number,
              status: tracker.normalizeStatus(checkpoints),
              checkpoints: checkpoints
            })
          }

          if (external) {
            tracker.courier(external.courier.CODE).trace(external.number, function (err, trace) {
              if (err) {
                return cb(err)
              }
              checkpoints = checkpoints.concat(trace.checkpoints)
              checkpoints.sort(function (a, b) {
                return (+new Date(b.time)) - (+new Date(a.time))
              })
              complete()
            })
          } else {
            complete()
          }
        })
      })
    }
  }
}
