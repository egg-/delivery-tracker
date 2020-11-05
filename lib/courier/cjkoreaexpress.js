'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  number = (number + '').replace(/-/gm, '')
  return {
    cookie: {
      url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
      method: 'GET'
    },
    detail: function (csrf) {
      return {
        method: 'POST',
        url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking-detail',
        json: true,
        form: {
          '_csrf': csrf,
          'paramInvcNo': number
        }
      }
    }
  }
}

var parser = {
  csfr: function (body) {
    var matches = body.match(/name="_csrf"\s+value="([\d\w-]+)"/i)
    return matches ? matches[1] : ''
  },
  trace: function (body) {
    var courier = {
      code: tracker.COURIER.CJKOREAEXPRESS.CODE,
      name: tracker.COURIER.CJKOREAEXPRESS.NAME
    }
    var result = {
      courier: courier,
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }
    var checkpoints = []

    var resultMap = body.parcelDetailResultMap
    result.number = resultMap.paramInvcNo

    for (var i = 0; i < resultMap.resultList.length; i++) {
      var item = resultMap.resultList[i]
      var checkpoint = {
        courier: courier,
        location: item.regBranNm,
        message: [item.crgNm],
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.dTime + '+0900').utc().format('YYYY-MM-DDTHH:mmZ')
      }

      if (['집화처리', '상품인수'].indexOf(item.scanNm) !== -1) {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      } else if (item.scanNm === '배달완료') {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      checkpoints.push(checkpoint)
    }

    result.checkpoints = checkpoints.reverse()
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      var req = request.defaults({ jar: true })

      req(tracking.cookie, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        var csfrValue = parser.csfr(body)
        req(tracking.detail(csfrValue), function (err, res, body) {
          if (err) {
            return cb(err)
          }
          try {
            var result = parser.trace(body)
            cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
          } catch (e) {
            cb(tracker.error(e.message))
          }
        })
      })
    }
  }
}
