'use strict'

var request = require('request')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://digitalapi.auspost.com.au/track/v3/search?q=' + number,
    headers: {
      'Authorization': 'Basic cHJvZF90cmFja2FwaTpXZWxjb21lQDEyMw=='
    },
    json: true
  }
}

var normalize = function (item) {
  var courier = {
    code: tracker.COURIER.AUSPOST.CODE,
    name: tracker.COURIER.AUSPOST.NAME
  }
  var result = {
    courier: courier,
    number: item.TrackingID,
    status: tracker.STATUS.PENDING,
    checkpoints: []
  }

  if (item.ReturnMessage.Code === 'ESB-BUS-DATA-105') {
    // Item Does not Exists
    return null
  }

  var eventList = item.Consignment.Articles[0].Events

  for (var i = 0, len = eventList.length; i < len; i++) {
    var checkpoint = {
      courier: courier,
      location: eventList[i].Location,
      message: eventList[i].EventDescription,
      status: tracker.STATUS.IN_TRANSIT,
      time: eventList[i].EventDateTime
    }

    // https://developers.auspost.com.au/apis/shipping-and-tracking/reference/statuses
    eventList[i].Status === 'Started' && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
    ;['Cancelled', 'Cannot be delivered', 'Article damaged', 'Unsuccessful pickup'].indexOf(eventList[i].Status) !== -1 && (checkpoint.status = tracker.STATUS.EXCEPTION)
    eventList[i].Status === 'Delivered' && (checkpoint.status = tracker.STATUS.DELIVERED)

    result.checkpoints.push(checkpoint)
  }

  result.status = tracker.normalizeStatus(result.checkpoints)

  return result
}

var parser = {
  trace: function (items) {
    var results = []

    for (var i = 0, len = items.length; i < len; i++) {
      results.push(normalize(items[i]))
    }

    return results
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

        if (!body.QueryTrackEventsResponse) {
          return cb(tracker.error(tracker.ERROR.SEARCH_AGAIN))
        }

        try {
          var results = parser.trace(body.QueryTrackEventsResponse.TrackingResults)
          cb(results[0] ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), results[0])
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
