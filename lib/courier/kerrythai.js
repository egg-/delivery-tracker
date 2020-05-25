'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://track.th.kerryexpress.com/KPT/History/Detail/' + number
  }
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)

    var courier = {
      code: tracker.COURIER.KERRYTHAI.CODE,
      name: tracker.COURIER.KERRYTHAI.NAME
    }
    var result = {
      courier: courier,
      number: $('.info .line span').eq(0).text()
    }

    var checkpoints = []

    $('.colStatus .status').each(function (idx) {
      var $el = $(this)
      var statusMessage = $el.find('.desc .d1').text().trim()
      var locationMessage = $el.find('.desc .d2').text().trim()
      var message = [
        statusMessage,
        locationMessage
      ].join(' - ').replace(/\t/gi, '')

      var checkpoint = {
        courier: courier,
        location: locationMessage.replace(/\t/gi, ''),
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment($el.find('.date').text().trim().replace(/\s+Time/i, '').replace(/Date /i, ''), 'DD MMM YYYY HH:mm').format('YYYY-MM-DD HH:mm')
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
          var result = parser.trace(body, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
