'use strict'

var moment = require('moment')

// cache
var COURIERS = {}

var ERROR = {
  UNKNOWN: -1,
  INVALID_NUMBER: 10,
  INVALID_NUMBER_LENGTH: 11,
  INVALID_NUMBER_HEADER: 12,
  INVALID_NUMBER_COUNTRY: 13
}

var STATUS = {
  INFO_RECEIVED: 'InfoReceived',
  PENDING: 'Pending',
  IN_TRANSIT: 'InTransit',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Exception',
  FAIL_ATTEMPT: 'FailAttempt'
}

var getCourier = function (slug) {
  if (!COURIERS[slug]) {
    COURIERS[slug] = require('./courier/' + slug)
  }
  return COURIERS[slug]
}

module.exports = {
  COURIER: {
    KOREAPOST: {
      CODE: 'koreapost',
      NAME: 'Korea Post'
    },
    ECARGO: {
      CODE: 'ecargo',
      NAME: 'Ecargo'
    }
  },
  STATUS: STATUS,
  ERROR: ERROR,
  error: function (code) {
    var error = {
      code: ERROR.UNKNOWN,
      message: 'unknown error.'
    }

    switch (code) {
      case ERROR.INVALID_NUMBER:
      case ERROR.INVALID_NUMBER_LENGTH:
      case ERROR.INVALID_NUMBER_HEADER:
      case ERROR.INVALID_NUMBER_COUNTRY:
        error.code = code
        error.message = 'invalid trace number.'
        break
    }

    return error
  },
  courier: function (slug) {
    return getCourier(slug)
  },
  normalizeStatus: function (checkpoints) {
    var status = STATUS.PENDING
    if (checkpoints.length > 0) {
      status = checkpoints[0].status

      if ([STATUS.IN_TRANSIT, STATUS.FAIL_ATTEMPT].indexOf(status) !== -1) {
        if ((moment().unix() - moment(checkpoints[0].time).unix()) > 259200) {
          status = STATUS.EXCEPTION
        }
      }
    }
    return status
  }
}
