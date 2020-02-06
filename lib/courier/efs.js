'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://web.efs.asia/script/users/tracking.php',
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
      code: tracker.COURIER.EFS.CODE,
      name: tracker.COURIER.EFS.NAME
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

      var statusMessage = cols.eq(4).text().trim()
      var message = [
        statusMessage,
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
      if (/Delivered|Network Completed/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (/Shipping Scheduled/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      } else if (/Consignee absent/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.FAIL_ATTEMPT
      } else if (/Returned|Arrive Unmanifested|Short arrival|Bad Address|Customer refused|Declared lost|Failed delivery/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.EXCEPTION
      }

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
