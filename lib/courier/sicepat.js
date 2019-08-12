'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'http://api.sicepat.com/customer/waybill?waybill=' + number,
    json: true
  }
}

var parser = {
  trace: function (body, number) {
    var courier = {
      code: tracker.COURIER.SICEPAT.CODE,
      name: tracker.COURIER.SICEPAT.NAME
    }

    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    var history = body.sicepat.result.track_history || []
    for (var i = history.length - 1; i >= 0; i--) {
      var item = history[i]
      var checkpoint = {
        courier: courier,
        location: '',
        message: '[' + item.status + '] ' + (item.receiver_name || item.city || ''),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.date_time + '+0700').utc().format('YYYY-MM-DDTHH:mmZ')
      }

      if (item.status === 'DELIVERED') {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      checkpoints.push(checkpoint)
    }

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      if (!opts.apikey) {
        return cb('required apikey')
      }

      var tracking = trackingInfo(number)
      tracking.headers = {
        'api-key': opts.apikey
      }

      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        if (body.sicepat.status.code !== 200) {
          return cb(body.sicepat.status.description)
        }

        var result = parser.trace(body, number)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
