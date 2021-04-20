'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://www.jtexpress.ph/index/router/index.html',
    json: true,
    body: {
      method: 'app.findTrack',
      data: {
        billcode: number,
        lang: 'en',
        source: 3
      }
    }
  }
}

var parser = {
  trace: function (data) {
    var courier = {
      code: tracker.COURIER.JNT.CODE,
      name: tracker.COURIER.JNT.NAME
    }
    var result = {
      courier: courier,
      number: data.billcode,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    for (var i = 0; i < data.details.length; i++) {
      var item = data.details[i]
      var message = [
        item.desc
      ].join(' - ')
      var checkpoint = {
        courier: courier,
        location: item.city || item.siteName,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.scantime + 'T+0800', 'YYYY-MM-DD HH:mm:ssZ').utc().format('YYYY-MM-DDTHH:mmZ')
      }

      if (item.scanstatus === 'Delivered') {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (item.scanstatus === 'Returned') {
        checkpoint.status = tracker.STATUS.RETURNED
      }
      checkpoints.push(checkpoint)
    }

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function () {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)

      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          if (res.statusCode !== 200) {
            return cb(tracker.error(res.statusMessage))
          } else if (body.code !== 20000) {
            return cb(tracker.error(body.code, body.desc))
          }
          var result = parser.trace(JSON.parse(body.data))
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(tracker.error(e.message))
        }
      })
    }
  }
}
