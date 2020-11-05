'use strict'

var request = require('request')
var moment = require('moment')
var cheerio = require('cheerio')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    hash: {
      url: 'https://www.lbcexpress.com/AMisc/searchRedirect',
      method: 'POST',
      formData: {
        keyword: number
      }
    },
    checkpoints: function (hash) {
      return {
        url: 'https://www.lbcexpress.com/track/' + hash,
        method: 'GET'
      }
    }
  }
}

var parser = {
  trace: function (body, number) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.LBC.CODE,
      name: tracker.COURIER.LBC.NAME
    }

    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }

    var checkpoints = []
    $('.mobile-tracking-list').each(function (idx) {
      var checkpoint = {
        courier: courier,
        location: '',
        message: $(this).find('.mobile-tracking-details').eq(0).text().trim(),
        status: tracker.STATUS.IN_TRANSIT
      }

      // Tue, 02 June 2020
      var datetime = $(this).find('.mobile-tracking-timedate').text().trim()
      checkpoint.time = moment(datetime + '+0800', 'ddd DD MMMM YYYYZ').utc().format('YYYY-MM-DDTHH:mmZ')

      if (checkpoint.message.indexOf('Accepted at') !== -1) {
        checkpoint.status = tracker.STATUS.INFO_RECEIVED
      }
      if (checkpoint.message.indexOf('Received by') !== -1) {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

var loadHash = function (number, cb) {
  request(trackingInfo(number).hash, function (err, req, body) {
    cb(err, err ? null : JSON.parse(body).hash)
  })
}

module.exports = function () {
  return {
    trackingInfo: trackingInfo,
    loadHash: loadHash,
    trace: function (number, cb) {
      loadHash(number, function (err, hash) {
        if (err) {
          return cb(err)
        }
        var tracking = trackingInfo(number)
        request(tracking.checkpoints(hash), function (err, res, body) {
          if (err) {
            return cb(err)
          }

          try {
            var result = parser.trace(body, number)
            cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
          } catch (e) {
            cb(tracker.error(e.message))
          }
        })
      })
    }
  }
}
