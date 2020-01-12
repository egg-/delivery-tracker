'use strict'

const request = require('request')

const tracker = require('../')

const trackingInfo = function (numbers) {
  const trackingInfoList = []
  if (numbers instanceof Array === false) {
    numbers = [numbers]
  }
  for (let i = 0; i < numbers.length; i++) {
    trackingInfoList.push({
      trackNumberInfo: {
        trackingNumber: numbers[i]
      }
    })
  }
  return {
    method: 'POST',
    url: 'https://www.fedex.com/trackingCal/track',
    data: {
      data: JSON.stringify({
        TrackPackagesRequest: {
          trackingInfoList: trackingInfoList
        }
      }),
      action: 'trackpackages'
    }
  }
}

const normalize = function (item) {
  const courier = {
    code: tracker.COURIER.FEDEX.CODE,
    name: tracker.COURIER.FEDEX.NAME
  }
  const result = {
    courier: courier,
    number: item.displayTrackingNbr,
    status: tracker.STATUS.PENDING,
    checkpoints: []
  }

  if (item.isSuccessful) {
    const eventList = item.scanEventList

    for (let i = 0, len = eventList.length; i < len; i++) {
      const message = [eventList[i].status]
      eventList[i].scanDetails && message.push(eventList[i].scanDetails)

      const checkpoint = {
        courier: courier,
        location: eventList[i].scanLocation,
        message: message.join(' - '),
        status: tracker.STATUS.IN_TRANSIT,
        time: [eventList[i].date, eventList[i].time].join('T') + eventList[i].gmtOffset
      }

      // https://www.fedex.com/us/developer/WebHelp/ws/2014/dvg/WS_DVG_WebHelp/Appendix_Q_Track_Service_Scan_Codes.htm
      eventList[i].statusCD === 'OC' && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      eventList[i].isException && (checkpoint.status = tracker.STATUS.EXCEPTION)
      eventList[i].isDelivered && (checkpoint.status = tracker.STATUS.DELIVERED)

      result.checkpoints.push(checkpoint)
    }
  }

  result.status = tracker.normalizeStatus(result.checkpoints)

  return result
}

const parser = {
  trace: function (packageList) {
    const results = []

    for (let i = 0, len = packageList.length; i < len; i++) {
      results.push(normalize(packageList[i]))
    }

    return results
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      const tracking = trackingInfo(number)

      request.post({
        url: tracking.url,
        form: tracking.data,
        json: true
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        const results = parser.trace(body.TrackPackagesResponse.packageList)

        cb(null, results[0])
      })
    }
  }
}
