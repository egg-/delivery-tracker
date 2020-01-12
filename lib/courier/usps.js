'use strict'

const request = require('request')
const cheerio = require('cheerio')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://tools.usps.com/go/TrackConfirmAction.action?tLabels=' + number
  }
}

const parser = {
  trace: function (body) {
    const $ = cheerio.load(body)
    const courier = {
      code: tracker.COURIER.USPS.CODE,
      name: tracker.COURIER.USPS.NAME
    }
    const result = {
      courier: courier,
      number: $('input[name=label]').val(),
      status: tracker.STATUS.PENDING
    }
    const toText = function (txt) {
      if (!txt) {
        return ''
      }
      return $(txt.indexOf('<span>') !== -1 ? txt : '<span>' + txt + '</span>').text().trim()
    }

    const checkpoints = []

    const $history = $('#trackingHistory_1').find('.panel-actions-content')
    $('.mobileOnly').remove()

    // html -> txt
    let rawTxt = $history.html()
    if (rawTxt) {
      rawTxt = rawTxt.replace(/\s+/g, ' ')
    }
    // txt -> history list
    const rawList = rawTxt.split('<hr>')
    for (let i = 0; i < rawList.length; i++) {
      const list = rawList[i].split('<br>')
      if (list.length < 3) {
        continue
      }
      const time = $(list[0]).text().trim()
      const statusMessage = toText(list[1])
      const location = toText(list[2])
      const message = [statusMessage]

      if (list[3].trim().length > 0) {
        message.push(toText(list[3]))
      }

      const checkpoint = {
        courier: courier,
        location: location,
        message: message.join(' - '),
        status: tracker.STATUS.IN_TRANSIT,
        // November 17, 2017, 3:08 pm
        time: moment(time, 'MMMM DD, YYYY, hh:mm a').format('YYYY-MM-DDTHH:mm')
      }

      checkpoint.message.indexOf('Shipping Label Created') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    }

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
      request.get({
        url: tracking.url
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        const result = parser.trace(body)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
