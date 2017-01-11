'use strict'

var async = require('async')
var request = require('request')
var parseString = require('xml2js').parseString

var tracker = require('../')

var courier = {
  code: tracker.COURIER.PANTOS.CODE,
  name: tracker.COURIER.PANTOS.NAME
}

var trackingInfo = function (number) {
  return {
    summary: {
      method: 'POST',
      url: 'http://totprd.pantos.com/gsi/vm/intrnTrckgMgnt/inqNotLoginExpsTrckg.ajax',
      data: {
        quickType: 'HBL_NO',
        quickNo: number,
        searchType: ''
      }
    },
    events: {
      method: 'POST',
      url: 'http://totprd.pantos.com/gsi/vm/intrnTrckgMgnt/inqExpsTrckgEvntList.ajax',
      data: {
        hblNo: number
      }
    }
  }
}

var parser = {
  summary: function (body, cb) {
    parseString(body, function (err, xml) {
      if (err) {
        return cb(err)
      }

      if (xml.xsync.alert) {
        return cb(xml.xasync.alert[0])
      }

      var data = xml.xsync.LMultiData[0]

      cb(null, {
        number: data.hblNo[0],
        external: {
          link: data.linkedAddr[0],
          number: data.wexTrckgNo[0]
        }
      })
    })
  },
  checkpoints: function (body, cb) {
    parseString(body, function (err, xml) {
      if (err) {
        return cb(err)
      }

      var data = xml.xsync.LMultiData[0]
      var checkpoints = []

      for (var i = 0, len = data.actEvntLoclYmd.length; i < len; i++) {
        var checkpoint = {
          courier: courier,
          location: data.portCd[i],
          message: data.evntNm[i],
          status: tracker.STATUS.IN_TRANSIT,
          time: [data.actEvntLoclYmd[i], data.actEvntLoclHm[i]].join('T')
        }

        checkpoint.message.indexOf('Pick-Up') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
        checkpoint.message.indexOf('Delivered') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

        checkpoints.push(checkpoint)
      }

      cb(null, checkpoints.reverse())
    })
  }
}

module.exports = {
  trackingInfo: trackingInfo,
  trace: function (number, cb) {
    var tracking = trackingInfo(number)
    var result = {
      courier: courier,
      number: number,
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }

    async.waterfall([
      function (cb) {
        // fetch summary information
        request.post({
          url: tracking.summary.url,
          form: tracking.summary.data
        }, function (err, res, body) {
          if (err) {
            return cb(err)
          }

          parser.summary(body, cb)
        })
      },
      function (summary, cb) {
        result.number = summary.number

        // fetch checkpoints
        request.post({
          url: tracking.events.url,
          form: tracking.events.data
        }, function (err, res, body) {
          if (err) {
            return cb(err)
          }

          parser.checkpoints(body, cb)
        })
      },
      function (checkpoints, cb) {
        result.checkpoints = checkpoints
        result.status = tracker.normalizeStatus(result.checkpoints)
        cb(null, result)
      }
    ], function (err, trace) {
      if (err) {
        if (err === 'There is not data found') {
          return cb(null, result)
        }
        return cb(err)
      }

      cb(null, trace)
    })
  }
}
