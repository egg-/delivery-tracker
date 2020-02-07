'use strict'

var request = require('request')
var moment = require('moment')
var cheerio = require('cheerio')

var tracker = require('../')

var loadHandler = function (opts) {
  if (opts && opts.apikey) {
    return {
      trackingInfo: function (number) {
        return {
          method: 'GET',
          url: 'http://api.sicepat.com/customer/waybill?waybill=' + number,
          json: true
        }
      },
      parser: {
        trace: function (body, number) {
          var courier = {
            code: tracker.COURIER.SICEPAT.CODE,
            name: tracker.COURIER.SICEPAT.NAME
          }

          var result = {
            courier: courier,
            number: number,
            status: tracker.STATUS.PENDING
          }

          var checkpoints = []
          var history = body.sicepat.result.track_history || []
          for (var i = history.length - 1; i >= 0; i--) {
            var item = history[i]
            var checkpoint = {
              courier: courier,
              location: '',
              message: '[' + item.status + '] ' + (item.receiver_name || item.city || ''),
              status: tracker.STATUS.IN_TRANSIT,
              time: moment(item.date_time + '+0700').utc().format('YYYY-MM-DDTHH:mmZ')
            }

            if (item.status === 'PICKREQ') {
              checkpoint.status = tracker.STATUS.INFO_RECEIVED
            } else if (item.status === 'DELIVERED') {
              checkpoint.status = tracker.STATUS.DELIVERED
            }

            checkpoints.push(checkpoint)
          }

          result.checkpoints = checkpoints
          result.status = tracker.normalizeStatus(result.checkpoints)

          return result
        }
      },
      load: function (tracking, cb) {
        tracking.headers = {
          'api-key': opts.apikey
        }
        request(tracking, function (err, res, body) {
          if (err) {
            return cb(err)
          }

          if (!body.sicepat) {
            return cb(tracker.error(tracker.ERROR.UNKNOWN))
          }
          if (body.sicepat.status.code !== 200) {
            return cb(tracker.error(body.sicepat.status.description))
          }

          cb(null, res, body)
        })
      }
    }
  }

  var extractNumber = function (str) {
    var matches = str.match(/(\d+)/)
    return matches ? matches[1] : null
  }

  return {
    trackingInfo: function (number) {
      return {
        method: 'POST',
        url: 'http://sicepat.com/checkAwb',
        data: {
          'textarea-awb': number
        }
      }
    },
    parser: {
      trace: function (body, number) {
        var $ = cheerio.load(body)
        var courier = {
          code: tracker.COURIER.SICEPAT.CODE,
          name: tracker.COURIER.SICEPAT.NAME
        }

        var result = {
          courier: courier,
          number: number,
          status: tracker.STATUS.PENDING
        }

        var checkpoints = []
        var $body = $('#awb-list')
        var $summary = $body.find('.res-item')

        if ($summary.length > 0) {
          result.number = extractNumber($summary.find('td').eq(1).text())
          if ($summary.find('td').eq(7).text().trim() === 'DELIVERED') {
            result.status = tracker.STATUS.DELIVERED
          }

          $body.find('.res-detail .table').eq(2).find('tr').each(function (idx) {
            if (idx === 0) {
              return true
            }
            var $cols = $(this).find('td')
            checkpoints.push({
              courier: courier,
              location: '',
              message: $cols.eq(1).text().trim(),
              status: tracker.STATUS.IN_TRANSIT,
              time: moment($cols.eq(0).text().trim() + '+0700', 'DD-MM-YYYY HH:mmZ').utc().format('YYYY-MM-DDTHH:mmZ')
            })
          })
        }

        result.checkpoints = checkpoints

        return result
      }
    },
    load: function (tracking, cb) {
      request.post({
        url: tracking.url,
        form: tracking.data
      }, cb)
    }
  }
}

module.exports = function (opts) {
  var handler = loadHandler(opts)
  return {
    trackingInfo: handler.trackingInfo,
    trace: function (number, cb) {
      handler.load(handler.trackingInfo(number), function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = handler.parser.trace(body, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
