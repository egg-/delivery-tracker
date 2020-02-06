'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://th.kerryexpress.com/en/track/?track=' + number
  }
}

var parser = {
  trace: function (body, number) {
    var $ = cheerio.load(body)
    var $trackArea = $('#trackArea')

    var courier = {
      code: tracker.COURIER.KERRYTHAI.CODE,
      name: tracker.COURIER.KERRYTHAI.NAME
    }
    var result = {
      courier: courier,
      number: $trackArea.find('.info .line span').eq(0).text()
    }

    var checkpoints = []

    $trackArea.find('.status').each(function (idx) {
      var $el = $(this)
      var statusMessage = $el.find('.desc .d1').text().trim()
      var locationMessage = $el.find('.desc .d2').text().trim()
      var message = [
        statusMessage,
        locationMessage
      ].join(' - ')

      var checkpoint = {
        courier: courier,
        location: locationMessage,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment($el.find('.date').text().trim().replace(/\s+Time/i, '').replace(/Date /i, '') + '+07:00', 'DD MMM YY HH:mmZZ').format()
      }
      if (/delivery successful/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
