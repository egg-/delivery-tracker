'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

const STATUS_MAP = {
  '10': tracker.STATUS.PENDING,
  '20': tracker.STATUS.INFO_RECEIVED,
  '30': tracker.STATUS.IN_TRANSIT,
  '100': tracker.STATUS.IN_TRANSIT,
  '200': tracker.STATUS.IN_TRANSIT,
  '300': tracker.STATUS.IN_TRANSIT,
  '400': tracker.STATUS.IN_TRANSIT,
  '500': tracker.STATUS.IN_TRANSIT,
  '700': tracker.STATUS.DELIVERED
}

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'http://system.yello-express.com/Search/Tracking?invoiceNo=' + number
  }
}

var extractNumber = function (str) {
  var matches = str.match(/Invoice No : (\w+)+/)
  return matches[1]
}

var extractDatetime = function (str) {
  var matches = str.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/)
  return matches[1]
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.YELLOEXPRESS.CODE,
      name: tracker.COURIER.YELLOEXPRESS.NAME
    }
    var result = {
      courier: courier,
      number: extractNumber(body),
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }

    var $shipping = $('table').eq(0)
    var $delivery = $('table').eq(1)

    $shipping.find('tbody tr').each(function (idx) {
      var cols = $(this).find('td')
      var checkpoint = {
        courier: courier,
        location: cols.eq(3).text().trim(),
        message: cols.eq(2).text().trim(),
        status: STATUS_MAP[cols.eq(1).text().trim()],
        time: moment(extractDatetime(cols.eq(0).text().trim()), 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss')
      }

      result.checkpoints.push(checkpoint)
    })
    $delivery.find('tbody tr').each(function (idx) {
      var cols = $(this).find('td')

      var checkpoint = {
        courier: courier,
        location: '',
        message: cols.eq(2).text().trim(),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(extractDatetime(cols.eq(1).text().trim()), 'YYYY-MM-DD HH:mm').format('YYYY-MM-DDTHH:mm:ss')
      }

      if (/Delivered/i.test(checkpoint.message) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      result.checkpoints.push(checkpoint)
    })

    result.checkpoints.sort(function (a, b) {
      return (+new Date(b.time)) - (+new Date(a.time))
    })
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
          var result = parser.trace(body)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
