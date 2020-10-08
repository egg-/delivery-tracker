'use strict'

var request = require('request')
var tracker = require('../index')
var moment = require('moment')

var trackingInfo = function (number) {
  return {
    cookie: {
      url: 'https://www.ups.com/track',
      method: 'GET'
    },
    detail: function (token) {
      return {
        method: 'POST',
        url: 'https://www.ups.com/track/api/Track/GetStatus?loc=en_US',
        body: JSON.stringify({
          Locale: 'en_US',
          Requester: 'UPSHome',
          TrackingNumber: [number]
        }),
        headers: {
          'content-type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0',
          'X-XSRF-TOKEN': token
        }
      }
    }
  }
}

var parser = {
  token: function (rawcookies) {
    var cookies = {}
    for (var i = 0; i < rawcookies.length; i++) {
      var keyval = rawcookies[i].split(';')[0].split('=')
      cookies[keyval[0]] = keyval[1]
    }
    return cookies['X-XSRF-TOKEN-ST']
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
        var token = parser.token(res.headers['set-cookie'] || [])
        req(tracking.detail(token), function (err, res, body) {
          var response = JSON.parse(body)
          if (response.statusCode !== '200') {
            return cb(response.statusText)
          }
          var currentTrackNumberStatus = response.trackDetails[0]
          if (err || currentTrackNumberStatus.errorCode !== null) {
            return cb(err || currentTrackNumberStatus.errorText)
          }

          var courier = {
            code: tracker.COURIER.UPS.CODE,
            name: tracker.COURIER.UPS.NAME
          }
          var result = {
            courier: courier,
            status: currentTrackNumberStatus.progressBarType,
            number: currentTrackNumberStatus.trackingNumber
          }
          var checkpoints = []

          for (var i = 0; i < currentTrackNumberStatus.shipmentProgressActivities.length; i++) {
            var current = currentTrackNumberStatus.shipmentProgressActivities[i]
            if (!current.date) {
              continue
            }

            var checkpoint = {
              courier: courier,
              location: current.location,
              message: current.activityScan.trim(),
              status: tracker.STATUS.IN_TRANSIT,
              time: moment([current.date, current.time].join(' '), 'MM/DD/YYYY HH:mm').format('YYYY-MM-DDTHH:mmZ')
            }

            if (checkpoint.message.indexOf('DELIVERED') !== -1) {
              checkpoint.status = tracker.STATUS.DELIVERED
            }

            checkpoints.push(checkpoint)
          }

          result.checkpoints = checkpoints
          result.status = tracker.normalizeStatus(result.checkpoints)

          cb(null, result)
        })
      })
    }
  }
}
