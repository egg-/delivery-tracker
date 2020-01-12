'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')
const async = require('async')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'http://www.rincos.co.kr/tracking/tracking_web.asp',
    data: {
      invoice: number
    }
  }
}

const parser = {
  trace: function (body, cb) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.RINCOS.CODE,
      name: tracker.COURIER.RINCOS.NAME
    }
    const result = {
      courier: courier,
      number: '',
      status: tracker.STATUS.PENDING
    }

    const checkpoints = []

    const $area = $('div.border > table > tr').eq(1)
    const $infoTable = $area.find('> td > table')

    const $summary = $infoTable.eq(0).find('tr').eq(1).find('> td')
    const $checkpoints = $infoTable.eq(1).find('> tr')

    result.number = $summary.eq(2).text().trim()

    if (!result.number) {
      return cb(tracker.error(tracker.ERROR.INVALID_NUMBER))
    }

    $checkpoints.each(function (idx) {
      if (idx < 3 || $(this).find('> td').length === 1) {
        return true
      }

      const $cols = $(this).find('> td')
      const checkpoint = {
        courier: courier,
        location: $cols.eq(4).text().trim(),
        message: $cols.eq(6).text().trim(),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment([$cols.eq(0).text().trim(), $cols.eq(2).text().trim()].join(' '), 'YYYY.MM.DD HH:mm').format('YYYY-MM-DDTHH:mm')
      }

      if (/Picked Up/i.test(checkpoint.message) === true) {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      } else if (/SUCCEED RECEIVED BY|Delivered|RELEASED TO REPRESENTATIVE|FINAL DELIVERY|DELIVERD/i.test(checkpoint.message) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

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
