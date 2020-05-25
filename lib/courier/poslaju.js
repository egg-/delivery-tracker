'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')
var async = require('async')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://www.poslaju.com.my/track-trace-v2/',
    data: {
      trackingNo03: number
    }
  }
}

var parser = {
  trace: function (str, cb) {
    var matchesNumber = str.match(/id="trackingNo03".*>(.*)<\/textarea>/)
    var matchesCheckpoint = str.match(/var strTD =\s+"(.*)";/)
    var $ = cheerio.load(matchesCheckpoint[1])
    var courier = {
      code: tracker.COURIER.POSLAJU.CODE,
      name: tracker.COURIER.POSLAJU.NAME
    }
    var result = {
      courier: courier,
      number: matchesNumber[1],
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    var $checkpoints = $('tbody > tr')
    $checkpoints.each(function (idx) {
      var $cols = $(this).find('> td')
      var checkpoint = {
        courier: courier,
        location: $cols.eq(2).text().trim(),
        message: $cols.eq(1).text().trim(),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment($cols.eq(0).text().trim(), 'DD MMM YYYY, HH:mm:ss').format('YYYY-MM-DDTHH:mm:ss')
      }

      checkpoint.message.indexOf('Item posted over the counter') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('Unsuccessful delivery') !== -1 && (checkpoint.status = tracker.STATUS.EXCEPTION)
      checkpoint.message.indexOf('successfully delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.message.indexOf('delivered to') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints
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
          try {
            parser.trace(body, cb)
          } catch (e) {
            cb(e.message)
          }
        }
      ], cb)
    }
  }
}
