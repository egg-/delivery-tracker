'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var MAP_MONTH = {
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

var MAP_STATUS = {
  booking: tracker.STATUS.INFO_RECEIVED,
  pickup: tracker.STATUS.PENDING,
  delivery: tracker.STATUS.IN_TRANSIT,
  delivered: tracker.STATUS.DELIVERED
}

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://cesco-logistics.com/cari.php',
    data: {
      q: number
    }
  }
}

var parseTime = function (str) {
  var matches = str.match(/date:\s+(\w+). (\d+), (\d+)/m)
  if (matches) {
    var month = MAP_MONTH[(matches[1]).toLowerCase()] || matches[1]
    var date = matches[2]
    var year = matches[3]

    return moment([month, date, year, '+0700'].join(' '), 'MMM DD YYYY Z').format()
  }
  return null
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.CESCO.CODE,
      name: tracker.COURIER.CESCO.NAME
    }
    var result = {
      courier: courier,
      number: $('#inv_no').val(),
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }
    var checkpoints = []

    $('.col-sm-3').each(function (idx) {
      var $el = $(this)
      var status = $el.find('h2').text()
      var message = $el.text().replace(/\n/gi, '').replace(/\t/gi, '')
      var time = parseTime(message)

      if (time) {
        var checkpoint = {
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
      var tracking = trackingInfo(number)

      request.post({
        url: tracking.url,
        form: tracking.data,
        rejectUnauthorized: false
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }
        try {
          var result = parser.trace(body)
          result.number = number
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
