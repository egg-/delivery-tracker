'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://www.doortodoor.co.kr/m/sub/doortodoor.do',
    data: {
      'fsp_action': 'PARC_ACT_002',
      'fsp_cmd': 'retrieveInvNoACTM',
      'invc_no': number
    }
  }
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.CJKOREAEXPRESS.CODE,
      name: tracker.COURIER.CJKOREAEXPRESS.NAME
    }
    var result = {
      courier: courier,
      number: $('#inv_no').val(),
      status: tracker.STATUS.PENDING,
      checkpoints: []
    }
    var checkpoints = []

    $('table.listSty2').find('tbody tr').each(function () {
      var cols = $(this).find('td')

      var status = cols.eq(2).text().trim().replace(/\s{2,}/, ' ')
      var time = cols.eq(0).text().trim().replace(/\s{2,}/, ' ')

      var checkpoint = {
        courier: courier,
        location: cols.eq(1).text().trim(),
        message: status,
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(time, 'YYYY-MM-DD HH:mm').utcOffset(540).format('YYYY-MM-DDTHH:mm:ss')
      }

      checkpoint.message.indexOf('집화처리') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('배달완료') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

      checkpoints.push(checkpoint)
    })

    result.checkpoints = checkpoints.reverse()
    result.status = tracker.normalizeStatus(result.checkpoints)

    return result
  }
}

module.exports = function (opts) {
  return {
    trackingInfo: trackingInfo,
    trace: function (number, cb) {
      var tracking = trackingInfo(number)

      request.post({
        url: tracking.url,
        form: tracking.data
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        var result = parser.trace(body)
        cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
      })
    }
  }
}
