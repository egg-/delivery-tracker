'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://eparcel.kr/Track/Result?mode=0&ids=' + number
  }
}

var extractNumber = function (str) {
  var matches = str.match(/Delivery No : (\w+)/)
  return matches ? matches[1] : null
}

var parser = {
  trace: function (body, number) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.EPARCEL.CODE,
      name: tracker.COURIER.EPARCEL.NAME
    }
    var $body = $('.result-body-1')
    var $summary = $body.find('.panel-body')
    var $checkpoints = $body.find('.table-striped tbody')

    var result = {
      courier: courier,
      number: extractNumber($summary.text()) || number
    }

    var checkpoints = []
    if ($checkpoints.length > 0) {
      $checkpoints.find('tr').each(function (idx) {
        var cols = $(this).find('td')
        var statusMessage = cols.eq(1).text().trim()
        var locationMessage = cols.eq(2).text().trim()
        var message = [
          statusMessage,
          locationMessage
        ].join(' - ')

        var checkpoint = {
          courier: courier,
          location: locationMessage,
          message: message,
          status: tracker.STATUS.IN_TRANSIT,
          time: moment(cols.eq(0).text().trim(), 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DDTHH:mm')
        }

        if (/delivered|delivery completed|completion of the delivery/i.test(statusMessage) === true) {
          checkpoint.status = tracker.STATUS.DELIVERED
        } else if (/ready for/i.test(statusMessage) === true) {
          checkpoint.status = tracker.STATUS.INFO_RECEIVED
        }

        checkpoints.push(checkpoint)
      })
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
      var tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body, number)
          cb(null, result)
        } catch (err) {
          cb(err.message)
        }
      })
    }
  }
}
