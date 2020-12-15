'use strict'

var request = require('request')
var moment = require('moment')

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

  return {
    trackingInfo: function (number) {
      return {
        method: 'GET',
        url: 'https://content-main-api-production.sicepat.com/public/check-awb/' + number,
        json: true
      }
    },
    parser: {
      trace: function (data, number) {
        var courier = {
          code: tracker.COURIER.SICEPAT.CODE,
          name: tracker.COURIER.SICEPAT.NAME
        }

        var result = {
          courier: courier,
          number: data.waybill_number,
          status: tracker.STATUS.PENDING
        }

        var checkpoints = []
        for (var i = 0; i < data.track_history.length; i++) {
          var item = data.track_history[i]
          var checkpoint = {
            courier: courier,
            location: '',
            message: item.city || item.receiver_name,
            status: tracker.STATUS.IN_TRANSIT,
            time: moment(item.date_time + '+0700', 'YYYY-MM-DD HH:mmZ').utc().format('YYYY-MM-DDTHH:mm:ssZ')
          }

          if (item.status === 'PICKREQ') {
            checkpoint.status = tracker.STATUS.INFO_RECEIVED
          } else if (item.status === 'DELIVERED') {
            checkpoint.status = tracker.STATUS.DELIVERED
          }
          checkpoints.push(checkpoint)
        }

        result.checkpoints = checkpoints.reverse()
        result.status = tracker.normalizeStatus(result.checkpoints)

        return result
      }
    },
    load: function (tracking, cb) {
      request(tracking, cb)
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
          if (body.sicepat.status.code !== 200) {
            return cb(tracker.error(body.sicepat.status.description))
          }
          var result = handler.parser.trace(body.sicepat.result, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(tracker.error(e.message))
        }
      })
    }
  }
}
