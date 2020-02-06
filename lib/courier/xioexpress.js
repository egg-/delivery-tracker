'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://xioexpress.com/api/waybill/transactionCode?transactionCode=' + number,
    json: true
  }
}

var parser = {
  trace: function (body, number) {
    var courier = {
      code: tracker.COURIER.XIOEXPRESS.CODE,
      name: tracker.COURIER.XIOEXPRESS.NAME
    }
    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    if (body.processing_date) {
      checkpoints.push({
        courier: courier,
        location: '',
        message: 'Processing',
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(body.processing_date + '+0800').utc().format('YYYY-MM-DDTHH:mmZ')
      })
    }

    if (body.arrived_at_hub_date) {
      checkpoints.push({
        courier: courier,
        location: '',
        message: 'Arrived at Hub',
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(body.arrived_at_hub_date + '+0800').utc().format('YYYY-MM-DDTHH:mmZ')
      })
    }

    if (body.delivered_date) {
      checkpoints.push({
        courier: courier,
        location: '',
        message: 'Delivered',
        status: tracker.STATUS.DELIVERED,
        time: moment(body.delivered_date + '+0800').utc().format('YYYY-MM-DDTHH:mmZ')
      })
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
      var tracking = trackingInfo(number)
      request(tracking, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
