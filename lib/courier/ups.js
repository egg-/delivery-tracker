'use strict'

var request = require('request')
var tracker = require('../index')

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
        const response = JSON.parse(body)
        if (response.statusCode !== '200') {
          return cb(response.statusText)
        }
        const currentTrackNumberStatus = response.trackDetails[0]
        if (err || currentTrackNumberStatus.errorCode !== null) {
          return cb(err || currentTrackNumberStatus.errorText)
        }
        cb(null, {
          courier: {
            code: tracker.COURIER.USPS.CODE,
            name: tracker.COURIER.USPS.NAME
          },
          status: response.trackDetails[0].progressBarType,
          number: number,
          checkpoints: []
        })
      })
    }
  }
}
