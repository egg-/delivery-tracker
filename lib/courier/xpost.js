'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://api.lbcx.ph/v1.1/orders/track/' + number,
    json: true
  }
}

var normalize = function (item) {
  var courier = {
    code: tracker.COURIER.XPOST.CODE,
    name: tracker.COURIER.XPOST.NAME
  }
  var result = {
    courier: courier,
    number: item.tracking_number,
    status: tracker.STATUS.PENDING,
    checkpoints: []
  }

  var events = item.events || []

  for (var i = 0, len = events.length; i < len; i++) {
    var checkpoint = {
      courier: courier,
      location: '',
      message: events[i].remarks,
      status: tracker.STATUS.IN_TRANSIT,
      time: moment(events[i].created_at).format()
    }

    // https://developers.XPOST.com.au/apis/shipping-and-tracking/reference/statuses
    events[i].status === 'picked_up' && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
    events[i].status === 'delivered' && (checkpoint.status = tracker.STATUS.DELIVERED)

    result.checkpoints.push(checkpoint)
  }

  result.checkpoints = result.checkpoints.reverse()
  result.status = tracker.normalizeStatus(result.checkpoints)

  return result
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)

      request(tracking, function (err, res, body) {
        try {
          cb(err, normalize(body))
        } catch (err) {
          cb(err)
        }
      })
    }
  }
}
