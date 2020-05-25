'use strict'

var moment = require('moment')

// cache
var COURIER_MODULES = {}

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
  },
  USPS: {
    CODE: 'usps',
    NAME: 'USPS'
  },
  CJKOREAEXPRESS: {
    CODE: 'cjkoreaexpress',
    NAME: 'CJ Korea Express'
  },
  DEPPON: {
    CODE: 'deppon',
    NAME: 'Deppon'
  },
  POSLAJU: {
    CODE: 'poslaju',
    NAME: 'POS Laju'
  },
  YELLOEXPRESS: {
    CODE: 'yelloexpress',
    NAME: 'Yello Express'
  },
  EFS: {
    CODE: 'efs',
    NAME: 'EFS'
  },
  AIRBRIDGE: {
    CODE: 'airbridge',
    NAME: 'AIR BRIDGE'
  },
  UPS: {
    CODE: 'ups',
    NAME: 'UPS'
  },
  TNT: {
    CODE: 'tnt',
    NAME: 'TNT'
  },
  CESCO: {
    CODE: 'cesco',
    NAME: 'CESCO'
  },
  XPOST: {
    CODE: 'xpost',
    NAME: 'XPOST'
  },
  KERRYTHAI: {
    CODE: 'kerrythai',
    NAME: 'KERRYTHAI'
  },
  SICEPAT: {
    CODE: 'sicepat',
    NAME: 'SICEPAT'
  },
  XIOEXPRESS: {
    CODE: 'xioexpress',
    NAME: 'XIOEXPRESS'
  },
  EPARCEL: {
    CODE: 'eparcel',
    NAME: 'eParcel'
  }
}

var ERROR = {
  UNKNOWN: -1,
  NOT_SUPPORT_SHIPMENT: 20,
  SEARCH_AGAIN: 21,
  INVALID_NUMBER: 10,
  INVALID_NUMBER_LENGTH: 11,
  INVALID_NUMBER_HEADER: 12,
  INVALID_NUMBER_COUNTRY: 13,
  REQUIRED_APIKEY: 30
}

var ERROR_MESSAGE = {
  30: 'required apikey.',
  20: 'shipment does not support.',
  21: 'working on it. Please search it again.',
  10: 'invalid trace number.',
  11: 'invalid trace number.',
  12: 'invalid trace number.',
  13: 'invalid trace number.'
}

var STATUS = {
  INFO_RECEIVED: 'InfoReceived',
  PENDING: 'Pending',
  IN_TRANSIT: 'InTransit',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Exception',
  FAIL_ATTEMPT: 'FailAttempt'
}

var getCourier = function (slug, opts) {
  slug = slug || 'undefined'
  var key = slug.toUpperCase()
  if (!COURIER[key]) {
    throw new Error('shipment does not support.')
  }
  if (!COURIER_MODULES[slug]) {
    COURIER_MODULES[slug] = require('./courier/' + slug)
  }
  var courier = COURIER_MODULES[slug](opts)
  courier.CODE = COURIER[key].CODE
  courier.NAME = COURIER[key].NAME
  return courier
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

    if (ERROR_MESSAGE[code]) {
      error.code = code
      error.message = ERROR_MESSAGE[code]
    } else {
      error.message = code
    }

    return error
  },
  courier: function (slug, opts) {
    return getCourier(slug, opts)
  },
  normalizeStatus: function (checkpoints) {
    var status = STATUS.PENDING
    var isDelivered = false
    var latestCheckpoint = null
    for (var i = 0; i < checkpoints.length; i++) {
      isDelivered = isDelivered || checkpoints[i].status === STATUS.DELIVERED
      if ((checkpoints[i].status === STATUS.DELIVERED || latestCheckpoint === null) && checkpoints[i].time) {
        latestCheckpoint = checkpoints[i]
      }
    }

    if (latestCheckpoint) {
      // Last checkpoint information is not final information.
      // The order may be mixed when the local delivery company progresses.
      status = isDelivered ? STATUS.DELIVERED : latestCheckpoint.status

      if ([STATUS.IN_TRANSIT, STATUS.FAIL_ATTEMPT].indexOf(status) !== -1) {
        if ((moment().unix() - moment(latestCheckpoint.time).unix()) > 259200) {
          status = STATUS.EXCEPTION
        }
      }
    }
    return status
  }
}
