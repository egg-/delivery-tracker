'use strict'

const async = require('async')
const request = require('request')
const moment = require('moment')

const tracker = require('../')

const PANTOS_COURIER = {
  code: tracker.COURIER.PANTOS.CODE,
  name: tracker.COURIER.PANTOS.NAME
}

const trackingInfo = function (number) {
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

const parser = {
  summary: function (body) {
    const item = body.OUT_DS1[0] || {}
    return {
      number: item.hblNo
    }
  },
  checkpoints: function (body) {
    const data = body.OUT_DS1
    const checkpoints = []

    for (let i = 0, len = data.length; i < len; i++) {
      const eventCode = data[i].evntCd
      const checkpoint = {
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
    const data = body.OUT_DS1[0]
    let courier = null
    const number = data.refBlNo

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
      const tracking = trackingInfo(number)
      const req = request.defaults({ jar: true })

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
          let summary = parser.summary(data.summary)
          let external = parser.external(data.summary)
          let checkpoints = parser.checkpoints(data.checkpoints)

          const complete = function () {
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
