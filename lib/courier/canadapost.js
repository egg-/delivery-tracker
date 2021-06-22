'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://www.canadapost-postescanada.ca/track-reperage/rs/track/json/package/' + number + '/detail'
  }
}

var parser = {
  trace: function (data) {
    var courier = {
      code: tracker.COURIER.CANADAPOST.CODE,
      name: tracker.COURIER.CANADAPOST.NAME
    }
    var result = {
      courier: courier,
      number: data.pin,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    for (var i = 0; i < data.events.length; i++) {
      var item = data.events[i]
      var checkpoint = {
        courier: courier,
        location: item.locationAddr.countryNmEn ? item.locationAddr.countryNmEn + ' ' + item.locationAddr.city : '',
        message: item.descEn,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.datetime.date + ' ' + item.datetime.time + 'T' + item.datetime.zoneOffset, 'YYYY-MM-DD HH:mm:ssZ').utc().format('YYYY-MM-DDTHH:mmZ')
      }

      if (item.type === 'Delivered') {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (item.type === 'Induction') {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
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
          var result = parser.trace(JSON.parse(body))
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(tracker.error(e.message))
        }
      })
    }
  }
}
