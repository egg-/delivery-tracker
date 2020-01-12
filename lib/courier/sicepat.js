'use strict'

const request = require('request')
const moment = require('moment')

const tracker = require('../')

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'http://api.sicepat.com/customer/waybill?waybill=' + number,
    json: true
  }
}

const parser = {
  trace: function (body, number) {
    const courier = {
      code: tracker.COURIER.SICEPAT.CODE,
      name: tracker.COURIER.SICEPAT.NAME
    }

    const result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING
    }

    const checkpoints = []
    const history = body.sicepat.result.track_history || []
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i]
      const checkpoint = {
        courier: courier,
        location: '',
        message: '[' + item.status + '] ' + (item.receiver_name || item.city || ''),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.date_time + '+0700').utc().format('YYYY-MM-DDTHH:mmZ')
      }

      if (item.status === 'DELIVERED') {
        checkpoint.status = tracker.STATUS.DELIVERED
      }

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
      if (!opts.apikey) {
        return cb(tracker.error(tracker.ERROR.REQUIRED_APIKEY))
      }

      const tracking = trackingInfo(number)
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

        const result = parser.trace(body, number)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
