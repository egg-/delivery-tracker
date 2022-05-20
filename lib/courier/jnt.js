'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    cookie: {
      url: 'https://www.jtexpress.ph/index/query/gzquery.html',
      method: 'GET'
    },
    track: {
      method: 'POST',
      url: 'https://www.jtexpress.ph/index/router/index.html',
      json: true,
      headers: {
        'X-SimplyPost-Id': 'testtesttest',
        'X-SimplyPost-Signature': '712d5af47cd24adf54fe39ebc4ed0aea'
      },
      body: {
        method: 'order.orderTrack',
        data: {
          billCode: number,
          lang: 'en',
          source: 3
        },
        version: '2.2.22',
        pId: 'testtesttest',
        pst: '712d5af47cd24adf54fe39ebc4ed0aea'
      }
    }
  }
}

var parser = {
  trace: function (data, number) {
    var courier = {
      code: tracker.COURIER.JNT.CODE,
      name: tracker.COURIER.JNT.NAME
    }
    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []
    for (var i = 0; i < data.details.length; i++) {
      var item = data.details[i]
      var message = [item.scanstatus].join(' - ')
      var checkpoint = {
        courier: courier,
        location: item.city || item.siteName,
        message: message,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(item.acceptTime + 'T+0800', 'YYYY-MM-DD HH:mm:ss.0Z')
          .utc()
          .format('YYYY-MM-DDTHH:mmZ')
      }

      if (item.scanscode === '5') {
        checkpoint.status = tracker.STATUS.DELIVERED
      } else if (item.scanstatus === 'Returned') {
        checkpoint.status = tracker.STATUS.RETURNED
      }
      checkpoints.push(checkpoint)
    }

    result.checkpoints = checkpoints
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function () {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)
      var req = request.defaults({ jar: true })

      req(tracking.cookie, function (err, res, body) {
        if (err) {
          return cb(err)
        }
        req(tracking.track, function (err, res, body) {
          if (err) {
            return cb(err)
          }

          try {
            if (res.statusCode !== 200) {
              return cb(tracker.error(res.statusMessage))
            } else if (body.code !== 200) {
              return cb(tracker.error(body.code, body.desc))
            }
            var result = parser.trace(JSON.parse(body.data), number)
            cb(
              result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER),
              result
            )
          } catch (e) {
            cb(tracker.error(e.message))
          }
        })
      })
    }
  }
}
