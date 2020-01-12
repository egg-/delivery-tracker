'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const MAP_MONTH = {
  nov: 'November',
  jan: 'January',
  mei: 'May',
  jun: 'June',
  apr: 'April',
  okt: 'October',
  jul: 'July',
  agu: 'August',
  des: 'December',
  mar: 'March',
  sep: 'September',
  feb: 'February'
}

const MAP_STATUS = {
  booking: tracker.STATUS.INFO_RECEIVED,
  pickup: tracker.STATUS.PENDING,
  delivery: tracker.STATUS.IN_TRANSIT,
  delivered: tracker.STATUS.DELIVERED
}

const trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://cesco-logistics.com/cari.php',
    data: {
      q: number
    }
  }
}

const parseTime = function (str) {
  const matches = str.match(/date:\s+(\w+). (\d+), (\d+)/m)
  if (matches) {
    const month = MAP_MONTH[(matches[1]).toLowerCase()] || matches[1]
    const date = matches[2]
    const year = matches[3]

    return moment([month, date, year, '+0700'].join(' '), 'MMM DD YYYY Z').format()
  }
  return null
}

const parser = {
  trace: function (body) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.CESCO.CODE,
      name: tracker.COURIER.CESCO.NAME
    }
    const result = {
      courier: courier,
      number: $('#inv_no').val(),
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }
    const checkpoints = []

    $('.col-sm-3').each(function (idx) {
      const $el = $(this)
      const status = $el.find('h2').text()
      const message = $el.text().replace(/\n/gi, '').replace(/\t/gi, '')
      const time = parseTime(message)

      if (time) {
        const checkpoint = {
          courier: courier,
          location: '',
          message: message,
          status: MAP_STATUS[(status || '').toLowerCase()],
          time: time
        }
        checkpoints.push(checkpoint)
      }
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
      const tracking = trackingInfo(number)

      request.post({
        url: tracking.url,
        form: tracking.data,
        rejectUnauthorized: false
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        const result = parser.trace(body)
        result.number = number
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
