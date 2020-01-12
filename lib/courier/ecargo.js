'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://web.ecargo.asia/script/users/tracking.php',
    data: {
      mode: 'search',
      search_no: number
    }
  }
}

const parser = {
  trace: function (body) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.ECARGO.CODE,
      name: tracker.COURIER.ECARGO.NAME
    }
    const result = {
      courier: courier,
      number: $('#search_no').val(),
      status: tracker.STATUS.PENDING
    }

    const checkpoints = []

    $('table').eq(6).find('tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      const cols = $(this).find('td')
      if (cols.length === 1) {
        return false
      }

      const message = [
        cols.eq(4).text().trim(),
        cols.eq(5).text().trim(),
        cols.eq(6).text().trim()
      ].join(' - ')

      const checkpoint = {
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
      const tracking = trackingInfo(number)
      request.post({
        url: tracking.url,
        form: tracking.data
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        const result = parser.trace(body)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
