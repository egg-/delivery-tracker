'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://wwwapps.ups.com/WebTracking/processInputRequest?HTMLVersion=5.0&loc=en_KR&Requester=UPSHome&AgreeToTermsAndConditions=yes&ignore=&track.x=29&track.y=8&tracknum=' + number
  }
}

const parser = {
  trace: function (body) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.UPS.CODE,
      name: tracker.COURIER.UPS.NAME
    }
    const result = {
      courier: courier,
      status: tracker.STATUS.PENDING
    }

    const $form = $('#podFormid')

    const checkpoints = []

    $('.dataTable tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      const cols = $(this).find('td')
      const date = cols.eq(1).text().trim()
      const checkpoint = {
        courier: courier,
        location: cols.eq(0).text().trim().replace(/(\\n|\\t|\s{2,})/g, ' '),
        message: cols.eq(3).text().trim().replace(/(\\n|\\t|\s{2,})/g, ' '),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment([date, cols.eq(2).text().trim()].join(' '), (date.indexOf('/') === 2 ? 'DD/MM/YYYY' : 'YYYY/MM/DD') + ' HH:mm').format('YYYY-MM-DDTHH:mm')
      }

      if (/Delivered/i.test(checkpoint.message) === true) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      checkpoints.push(checkpoint)
    })

    result.number = $form.find('input[name=tracknum]').val()
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

        const result = parser.trace(body)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
