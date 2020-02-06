'use strict'

var request = require('request')
var moment = require('moment')
var cheerio = require('cheerio')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://sicepat.com/checkAwb',
    data: {
      'textarea-awb': number
    }
  }
}

var extractNumber = function (str) {
  var matches = str.match(/(\d+)/)
  return matches ? matches[1] : null
}

var parser = {
  trace: function (body, number) {
    var $ = cheerio.load(body)
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
    var $body = $('#awb-list')
    var $summary = $body.find('.res-item')

    if ($summary.length > 0) {
      result.number = extractNumber($summary.find('td').eq(1).text())
      if ($summary.find('td').eq(7).text().trim() === 'DELIVERED') {
        result.status = tracker.STATUS.DELIVERED
      }

      $body.find('.res-detail .table').eq(2).find('tr').each(function (idx) {
        if (idx === 0) {
          return true
        }
        var $cols = $(this).find('td')
        checkpoints.push({
          courier: courier,
          location: '',
          message: $cols.eq(1).text().trim(),
          status: tracker.STATUS.IN_TRANSIT,
          time: moment($cols.eq(0).text().trim() + '+0700', 'DD-MM-YYYY HH:mmZ').utc().format('YYYY-MM-DDTHH:mmZ')
        })
      })
    }

    result.checkpoints = checkpoints

    return result
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      request.post({
        url: tracking.url,
        form: tracking.data
      }, function (err, res, body) {
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
