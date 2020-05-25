'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://web.ecargo.asia/script/users/tracking.php',
    data: {
      mode: 'search',
      search_no: number
    }
  }
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.ECARGO.CODE,
      name: tracker.COURIER.ECARGO.NAME
    }
    var result = {
      courier: courier,
      number: $('#search_no').val(),
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    $('table').eq(6).find('tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      var cols = $(this).find('td')
      if (cols.length === 1) {
        return false
      }

      var message = [
        cols.eq(4).text().trim(),
        cols.eq(5).text().trim(),
        cols.eq(6).text().trim()
      ].join(' - ')

      var checkpoint = {
        courier: courier,
        location: cols.eq(3).text().trim(),
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment([cols.eq(1).text().trim(), cols.eq(2).text().trim()].join(' '), 'YYYY.MM.DD HH:mm').format('YYYY-MM-DDTHH:mm')
      }

      message.indexOf('Shipment picked up') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      message.indexOf('Failed Delivery') !== -1 && (checkpoint.status = tracker.STATUS.FAIL_ATTEMPT)
      message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints.reverse()
    result.status = tracker.normalizeStatus(result.checkpoints)

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
          var result = parser.trace(body)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
