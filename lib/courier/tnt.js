'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://www.tnt.com/api/v2/shipment?con=' + number + '&searchType=CON&locale=en_US',
    json: true
  }
}

var filterConsignment = function (items) {
  var filtered = []
  for (var i = 0; i < items.length; i++) {
    if (items[i].podFound) {
      filtered.push(items[i])
    }
  }
  filtered.sort(function (a, b) {
    return (new Date(b.collectedDate || b.collectionDate)).getTime() - (new Date(a.collectedDate || a.collectionDate)).getTime()
  })
  return filtered.slice(0, 1)
}

var parser = {
  trace: function (body, number) {
    var courier = {
      code: tracker.COURIER.TNT.CODE,
      name: tracker.COURIER.TNT.NAME
    }
    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    var consignments = filterConsignment(body.consignment)
    if (consignments.length > 0) {
      var consignment = consignments[0]
      for (var i = 0, len = consignment.statusData.length; i < len; i++) {
        var status = consignment.statusData[i]
        var checkpoint = {
          courier: courier,
          location: status.depot,
          message: status.statusDescription,
          status: tracker.STATUS.IN_TRANSIT,
          time: moment(status.localEventDate).format('YYYY-MM-DDTHH:mm')
        }

        if (status.groupCode === 'DELRED') {
          checkpoint.status = tracker.STATUS.DELIVERED
        }

        checkpoints.push(checkpoint)
      }
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

        var output = body['tracker.output']
        if (output.notFound) {
          return cb(tracker.error(tracker.ERROR.INVALID_NUMBER))
        }

        try {
          var result = parser.trace(output, number)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
