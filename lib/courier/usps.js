'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://tools.usps.com/go/TrackConfirmAction.action?tLabels=' + number
  }
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.USPS.CODE,
      name: tracker.COURIER.USPS.NAME
    }
    var result = {
      courier: courier,
      number: $('.tracking-number .value').text().trim(),
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    var $details = $('#tc-hits')
    $details.find('tbody').find('tr.detail-wrapper').each(function (idx) {
      var cols = $(this).find('td')
      if (cols.length === 1) {
        return false
      }

      var message = [cols.eq(1).text().trim()]
      var time = moment(cols.eq(0).text().trim().replace(/\s{2,}/, ' '), 'MMM DD, YYYY, hh:mm a')
      var checkpoint = {
        courier: courier,
        location: cols.eq(2).text().trim(),
        message: message.join(' - '),
        status: tracker.STATUS.IN_TRANSIT,
        time: time.isValid() ? time.format('YYYY-MM-DDTHH:mm:ss') : ''
      }

      checkpoint.message.indexOf('Shipping Label Created') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = {
  trackingInfo: trackingInfo,
  trace: function (number, cb) {
    var tracking = trackingInfo(number)
    request.get({
      url: tracking.url
    }, function (err, res, body) {
      if (err) {
        return cb(err)
      }

      var result = parser.trace(body)
      cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
    })
  }
}
