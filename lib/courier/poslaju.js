'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')
const async = require('async')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://www.poslaju.com.my/track-trace-v2/',
    data: {
      trackingNo03: number
    }
  }
}

const parser = {
  trace: function (str, cb) {
    let matchesNumber = str.match(/id="trackingNo03".*>(.*)<\/textarea>/)
    let matchesCheckpoint = str.match(/var strTD =\s+"(.*)";/)
    const $ = cheerio.load(matchesCheckpoint[1])
    const courier = {
      code: tracker.COURIER.POSLAJU.CODE,
      name: tracker.COURIER.POSLAJU.NAME
    }
    const result = {
      courier: courier,
      number: matchesNumber[1],
      status: tracker.STATUS.PENDING
    }

    const checkpoints = []

    const $checkpoints = $('tbody > tr')
    $checkpoints.each(function (idx) {
      const $cols = $(this).find('> td')
      const checkpoint = {
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
      const tracking = trackingInfo(number)
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
