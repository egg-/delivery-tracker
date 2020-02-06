'use strict'

var request = require('request')
var tracker = require('../index')
var moment = require('moment')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://wwwapps.ups.com/track/api/Track/GetStatus?loc=en_KR',
    body: JSON.stringify({
      Locale: 'en_KR',
      Requester: 'UPSHome',
      TrackingNumber: [number]
    }),
    headers: {
      'content-type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0'
    }
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
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
            message: current.activityScan,
            status: tracker.STATUS.IN_TRANSIT,
            time: moment([current.date, current.time].join(' '), 'YYYY/MM/DD HH:mm').format('YYYY-MM-DDTHH:mm')
          }

          checkpoints.push(checkpoint)
        }

        result.checkpoints = checkpoints
        result.status = tracker.normalizeStatus(result.checkpoints)

        cb(null, result)
      })
    }
  }
}
