'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://www.royalmail.com/track-your-item?trackNumber=' + number
  }
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.ROYALMAIL.CODE,
      name: tracker.COURIER.ROYALMAIL.NAME
    }
    var result = {
      courier: courier,
      number: $('#edit-tracking-number').val(),
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    var $details = $('#rml-track-trace-tracking-details-dialog-' + result.number)
    $details = $details.find('table').eq(0)
    $details.find('tbody').find('tr').each(function (idx) {
      var cols = $(this).find('td')
      if (cols.length === 1) {
        return false
      }

      var message = [cols.eq(2).text().trim()]
      var time = moment(cols.eq(0).text().trim() + cols.eq(1).text().trim(), 'DD-MMM-YYYYHH:mm')
      var checkpoint = {
        courier: courier,
        location: cols.eq(3).text().trim(),
        message: message.join(' - '),
        status: tracker.STATUS.IN_TRANSIT,
        time: time.isValid() ? time.format('YYYY-MM-DDTHH:mm:ss') : ''
      }

      checkpoint.message.indexOf('Recipient Collected') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('NOT DELIVERED') !== -1 && (checkpoint.status = tracker.STATUS.FAIL_ATTEMPT)
      checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

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
      request.get({
        url: tracking.url
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
