'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'http://eparcel.kr/tracking/?tn=' + number
  }
}

const parser = {
  trace: function (body, number) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.AIRBRIDGE.CODE,
      name: tracker.COURIER.AIRBRIDGE.NAME
    }
    const result = {
      courier: courier,
      number: number
    }

    const checkpoints = []

    $('table').eq(0).find('tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      const cols = $(this).find('td')
      if (cols.length < 2) {
        return true
      }

      const statusMessage = cols.eq(1).text().trim()
      const locationMessage = cols.eq(0).text().trim()
      const message = [
        statusMessage,
        locationMessage
      ].join(' - ')

      const checkpoint = {
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
