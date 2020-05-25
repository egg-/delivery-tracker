'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'http://old.eparcel.kr/tracking/?tn=' + number
  }
}

var parser = {
  trace: function (body, number) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.AIRBRIDGE.CODE,
      name: tracker.COURIER.AIRBRIDGE.NAME
    }
    var result = {
      courier: courier,
      number: number
    }

    var checkpoints = []

    $('table').eq(0).find('tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      var cols = $(this).find('td')
      if (cols.length < 2) {
        return true
      }

      var statusMessage = cols.eq(1).text().trim()
      var locationMessage = cols.eq(0).text().trim()
      var message = [
        statusMessage,
        locationMessage
      ].join(' - ')

      var checkpoint = {
        courier: courier,
        location: locationMessage,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(cols.eq(2).text().trim(), 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DDTHH:mm')
      }
      if (/delivered|delivery completed/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
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
      // TNT
      if (number.match(/GE\d+/)) {
        return tracker.courier(tracker.COURIER.TNT.CODE).trace(number, cb)
      }

      var tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
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
