'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    token: {
      url: 'https://paxel.co/',
      method: 'GET'
    },
    detail: function (token) {
      return {
        method: 'POST',
        url: 'https://paxel.co/id/lacak-pengiriman',
        formData: {
          _token: token,
          shipment_code: number
        }
      }
    }
  }
}

var parser = {
  token: function (body) {
    var matches = body.match(/name="_token"\s+value="([\d\w-]+)"/i)
    return matches ? matches[1] : ''
  },
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.PAXEL.CODE,
      name: tracker.COURIER.PAXEL.NAME
    }
    var result = {
      courier: courier,
      status: tracker.STATUS.PENDING,
      number: $('.detail-container h5').text().trim(),
      checkpoints: []
    }
    var checkpoints = []

    var $timeline = $('.delivery-timeline > div')
    for (var i = 0; i < $timeline.length; i += 2) {
      var location = $timeline.eq(i).children().eq(0).text().trim()
      var time = $timeline.eq(i).children().eq(1).text().trim()
      var message = $timeline
        .eq(i + 1)
        .text()
        .trim()

      var checkpoint = {
        courier: courier,
        location: location,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        // Feb 04 | 17:02
        time: moment(time, 'MMM DD | kk:mm+0700')
      }
      if (/berhasil diantar/i.test(checkpoint.message) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (
        /Ordermu terkonfirmasi|Order sudah diterima/i.test(
          checkpoint.message
        ) === true
      ) {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      }

      // year not provided
      if (checkpoint.time.unix() > moment().unix()) {
        checkpoint.time.subtract(1, 'year')
      }
      checkpoint.time = checkpoint.time.format('YYYY-MM-DDTHH:mm:00+0700')

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
      var req = request.defaults({ jar: true })

      req(tracking.token, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        var token = parser.token(body)

        req(tracking.detail(token), function (err, res, body) {
          if (err) {
            return cb(err)
          }

          try {
            var result = parser.trace(body)
            cb(
              result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER),
              result
            )
          } catch (e) {
            console.log(e)
            cb(tracker.error(e.message))
          }
        })
      })
    }
  }
}
