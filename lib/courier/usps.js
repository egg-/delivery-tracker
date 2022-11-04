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
      number: $('input[name=label]').val().trim(),
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    var $history = $('.tracking-progress-bar-status-container').find('.tb-step')

    $history.each((index, element) => {
      if (
        element.attribs &&
        (element.attribs.class || '').indexOf('toggle-history-container') !== -1
      ) {
        return
      }

      var checkpoint = {
        courier: courier,
        location: $(element).find('.tb-location').text().trim(),
        message: $(element).find('.tb-status-detail').text(),
        status: tracker.STATUS.IN_TRANSIT,
        // November 17, 2017, 3:08 pm
        time: moment(
          $(element).find('.tb-date').text().trim(),
          'MMMM DD, YYYY, hh:mm a'
        ).format('YYYY-MM-DDTHH:mm')
      }

      checkpoint.message.indexOf('Shipping Label Created') !== -1 &&
        (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('Delivered') !== -1 &&
        (checkpoint.status = tracker.STATUS.DELIVERED)

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
      request.get({ url: tracking.url }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body)
          cb(
            result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER),
            result
          )
        } catch (e) {
          cb(tracker.error(e.message))
        }
      })
    }
  }
}
