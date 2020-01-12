'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://th.kerryexpress.com/en/track/?track=' + number
  }
}

const parser = {
  trace: function (body, number) {
    const $ = cheerio.load(body)
    const $trackArea = $('#trackArea')

    const courier = {
      code: tracker.COURIER.KERRYTHAI.CODE,
      name: tracker.COURIER.KERRYTHAI.NAME
    }
    const result = {
      courier: courier,
      number: $trackArea.find('.info .line span').eq(0).text()
    }

    const checkpoints = []

    $trackArea.find('.status').each(function (idx) {
      const $el = $(this)
      const statusMessage = $el.find('.desc .d1').text().trim()
      const locationMessage = $el.find('.desc .d2').text().trim()
      const message = [
        statusMessage,
        locationMessage
      ].join(' - ')

      const checkpoint = {
        courier: courier,
        location: locationMessage,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment($el.find('.date').text().trim().replace(/\s+Time/i, '').replace(/Date /i, '') + '+07:00', 'DD MMM YY HH:mmZZ').format()
      }
      if (/delivery successful/i.test(statusMessage) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

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
      const tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        const result = parser.trace(body, number)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
