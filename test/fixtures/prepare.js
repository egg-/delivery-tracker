'use strict'

var nock = require('nock')
var url = require('url')

var tracker = require('../../')

var prepareNock = function (trackingInfo, filename) {
  var info = url.parse(trackingInfo.url)
  nock([info.protocol, info.host].join('//'))[trackingInfo.method.toLowerCase()](info.path, trackingInfo.data)
    .replyWithFile(200, __dirname + '/' + filename)
}

var prepare = function (namespace, number, extention, isMultiple) {
  var courier = tracker.courier(tracker.COURIER[namespace].CODE)
  var trackingInfo = courier.trackingInfo(number)

  if (isMultiple) {
    for (var key in trackingInfo) {
      var filename = [namespace.toLowerCase(), number, key]
      prepareNock(trackingInfo[key], filename.join('-') + '.' + extention)
    }
  } else {
    prepareNock(trackingInfo, [namespace.toLowerCase(), number].join('-') + '.' + extention)
  }
}

module.exports = {
  koreapost: function (number) {
    prepare('KOREAPOST', number, 'html')
  },
  ecargo: function (number) {
    prepare('ECARGO', number, 'html')
  },
  fedex: function (number) {
    prepare('FEDEX', number, 'json')
  },
  auspost: function (number) {
    prepare('AUSPOST', number, 'json')
  },
  pantos: function (number) {
    prepare('PANTOS', number, 'xml', true)
  }
}
