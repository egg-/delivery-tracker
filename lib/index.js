'use strict'

var moment = require('moment')
var _ = require('lodash')

// cache
var COURIERS = {}

var COURIER = {
  KOREAPOST: {
    CODE: 'koreapost',
    NAME: 'Korea Post'
  },
  ECARGO: {
    CODE: 'ecargo',
    NAME: 'Ecargo'
  },
  FEDEX: {
    CODE: 'fedex',
    NAME: 'FedEx'
  },
  AUSPOST: {
    CODE: 'auspost',
    NAME: 'Australia Post'
  },
  PANTOS: {
    CODE: 'pantos',
    NAME: 'Pantos'
  },
  RINCOS: {
    CODE: 'rincos',
    NAME: 'RINCOS'
  },
  ROYALMAIL: {
    CODE: 'royalmail',
    NAME: 'Royal Mail'
  }
}

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
  slug = slug || 'undefined'
  if (!COURIER[slug.toUpperCase()]) {
    throw new Error('shipment does not support.')
  }
  if (!COURIERS[slug]) {
    COURIERS[slug] = require('./courier/' + slug)
  }
  return COURIERS[slug]
}

module.exports = {
  COURIER: COURIER,
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
    var latestCheckpoint = _.first(_.filter(checkpoints, function (o) {
      return o.time
    }))

    if (latestCheckpoint) {
      status = latestCheckpoint.status

      if ([STATUS.IN_TRANSIT, STATUS.FAIL_ATTEMPT].indexOf(status) !== -1) {
        if ((moment().unix() - moment(latestCheckpoint.time).unix()) > 259200) {
          status = STATUS.EXCEPTION
        }
      }
    }
    return status
  }
}
