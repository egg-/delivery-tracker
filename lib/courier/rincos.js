'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')
var async = require('async')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://www.rincos.co.kr/tracking/tracking_web.asp',
    data: {
      invoice: number
    }
  }
}

var parser = {
  trace: function (body, cb) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.RINCOS.CODE,
      name: tracker.COURIER.RINCOS.NAME
    }
    var result = {
      courier: courier,
      number: '',
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    var $area = $('div.border > table > tr').eq(1)
    var $infoTable = $area.find('> td > table')

    var $summary = $infoTable.eq(0).find('tr').eq(1).find('> td')
    var $checkpoints = $infoTable.eq(1).find('> tr')

    result.number = $summary.eq(2).text().trim()

    if (!result.number) {
      return cb(tracker.error(tracker.ERROR.INVALID_NUMBER))
    }

    $checkpoints.each(function (idx) {
      if (idx < 3 || $(this).find('> td').length === 1) {
        return true
      }

      var $cols = $(this).find('> td')
      var checkpoint = {
        courier: courier,
        location: $cols.eq(4).text().trim(),
        message: $cols.eq(6).text().trim(),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment([$cols.eq(0).text().trim(), $cols.eq(2).text().trim()].join(' '), 'YYYY.MM.DD HH:mm').format('YYYY-MM-DDTHH:mm')
      }

      checkpoint.message.indexOf('Picked Up') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('SUCCEED RECEIVED BY') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.message.indexOf('RELEASED TO REPRESENTATIVE') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.location === 'CJ-ASIA' && checkpoint.message === 'FINAL DELIVERY' && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.location === 'SKYNET' && checkpoint.message.indexOf('DELIVERED') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.location === 'Philippines' && checkpoint.message.indexOf('DELIVERED') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints.reverse()
    result.status = tracker.normalizeStatus(result.checkpoints)

    cb(null, result)
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      async.waterfall([
        function (cb) {
          request.post({
            url: tracking.url,
            form: tracking.data
          }, function (err, res, body) {
            cb(err, body)
          })
        },
        function (body, cb) {
          parser.trace(body, cb)
        }
      ], cb)
    }
  }
}
