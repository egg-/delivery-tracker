'use strict'

const request = require('request')
const moment = require('moment')

const tracker = require('../')

const normalizeStatus = function (checkpoints) {
  let status = tracker.STATUS.PENDING
  let isDelivered = false
  let latestCheckpoint = null

  for (let i = 0; i < checkpoints.length; i++) {
    isDelivered = isDelivered || checkpoints[i].ActivityCode === 'DEL'
    if ((checkpoints[i].ActivityCode === 'DEL' || latestCheckpoint === null) && checkpoints[i].StatusDateTime) {
      latestCheckpoint = checkpoints[i]
    }
  }

  if (latestCheckpoint) {
    status = isDelivered ? tracker.STATUS.DELIVERED : latestCheckpoint.StatusComment
    if ([tracker.STATUS.IN_TRANSIT, 'refused'].indexOf(status) !== -1) {
      if ((moment().unix() - moment(latestCheckpoint.StatusDateTime).unix()) > 259200) {
        status = tracker.STATUS.EXCEPTION
      }
    }
  }
  return status
}

const trackingInfo = function (number) {
  return {
    method: 'GET',
    url: 'https://webservices.rrts.com/TrackWebApi/api/values/' + number
  }
}

const parser = {
  trace: function (results) {
    results = JSON.parse(results).SearchResults[0]
    const shipment = results.Shipment

    const courier = {
      code: 'roadrunner',
      name: 'RoadRunner'
    }

    const result = {
      courier: courier,
      status: tracker.STATUS.PENDING
    }

    const checkpoints = []

    const eventList = shipment.Comments
    for (let i = 0, len = eventList.length; i < len; i++) {
      const checkpoint = {
        courier: courier,
        location: undefined,
        message: eventList[i].StatusComment,
        status: eventList[i].ActivityCode,
        time: eventList[i].StatusComment.slice(11).slice(0, 8)
      }
      checkpoints.push(checkpoint)
    }

    result.number = shipment.ProNumber
    result.checkpoints = Object.assign({}, checkpoints)
    result.status = normalizeStatus(shipment.Comments)

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
