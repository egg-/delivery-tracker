'use strict'

var request = require('request')
var cheerio = require('cheerio')
var moment = require('moment')

var tracker = require('../')

var trackingInfo = function (number) {
  return {
    method: 'POST',
    url: 'https://trace.epost.go.kr/xtts/servlet/kpl.tts.common.svl.SttSVL',
    data: {
      target_command: 'kpl.tts.tt.epost.cmd.RetrieveEmsTraceEngCmd',
      POST_CODE: number
    }
  }
}

var validateHeader = function (number) {
  var country = number.substring(number.length - 2, number.length).toUpperCase()
  var prefix1 = number.substring(0, 1).toUpperCase()

  if (['C', 'R', 'V', 'E', 'G', 'U', 'B', 'L'].indexOf(prefix1) !== -1 || ['LK', 'ZZ'].indexOf(prefix1) !== -1) {
    if (prefix1 === 'LK') {
      if (country === 'KR' || country === 'AU') {
        return true
      } else {
        return false
      }
    } else if (prefix1 === 'ZZ') {
      if (country === 'KR') {
        return true
      } else {
        return false
      }
    } else {
      return true
    }
  }
  return false
}

var validateCountry = function (number) {
  var charNum = 0
  var country = number.substring(number.length - 2, number.length).toUpperCase()

  for (var i = 0; i < country.length; i++) {
    if (country.charCodeAt(i) >= 65 && country.charCodeAt(i) <= 90) {
      ++charNum
    }
  }
  if (charNum === 2) {
    return true
  }

  return false
}

var validate = function (number) {
  // #ref https://service.epost.go.kr//postal/jscripts/epost_trace.js
  number = number.trim()

  // check header && check country
  if (number.length !== 13) {
    return tracker.ERROR.INVALID_NUMBER_LENGTH
  } else if (validateHeader(number) === false) {
    return tracker.ERROR.INVALID_NUMBER_HEADER
  } else if (validateCountry(number) === false) {
    return tracker.ERROR.INVALID_NUMBER_COUNTRY
  }
  return null
}

var parser = {
  trace: function (body) {
    var $ = cheerio.load(body)
    var courier = {
      code: tracker.COURIER.KOREAPOST.CODE,
      name: tracker.COURIER.KOREAPOST.NAME
    }
    var result = {
      courier: courier,
      number: $('#POST_CODE').val(),
      status: tracker.STATUS.PENDING
    }

    var checkpoints = []

    $('.table_col').find('tr').each(function (idx) {
      if (idx === 0) {
        return true
      }

      var cols = $(this).find('td')
      if (cols.length === 1) {
        return false
      }

      var message = [cols.eq(1).text().trim()]
      cols.eq(3).find('p').each(function () {
        message.push($(this).text().trim().replace(/\t/gim, '').replace(/\n/gi, '\n').replace(/\s{2,}/gi, ' '))
      })

      var checkpoint = {
        courier: courier,
        location: cols.eq(2).text().trim(),
        message: message.join(' - '),
        status: tracker.STATUS.IN_TRANSIT,
        time: moment(cols.eq(0).text().trim(), 'HH:mm DD-MMM-YYYY').format('YYYY-MM-DDTHH:mm:ss')
      }

      checkpoint.message.indexOf('Posting/Collection') !== -1 && (checkpoint.status = tracker.STATUS.INFO_RECEIVED)
      checkpoint.message.indexOf('Unsuccessful delivery') !== -1 && (checkpoint.status = tracker.STATUS.FAIL_ATTEMPT)
      checkpoint.message.indexOf('Delivery complete') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)
      checkpoint.message.indexOf('Final Delivery') !== -1 && (checkpoint.status = tracker.STATUS.DELIVERED)

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
      var invalidNumber = validate(number)
      if (invalidNumber !== null) {
        return cb(tracker.error(invalidNumber))
      }

      var tracking = trackingInfo(number)
      request.post({
        url: tracking.url,
        form: tracking.data
      }, function (err, res, body) {
        if (err) {
          return cb(err)
        }

        try {
          var result = parser.trace(body)
          cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
        } catch (e) {
          cb(e.message)
        }
      })
    }
  }
}
