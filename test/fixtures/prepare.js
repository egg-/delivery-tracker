'use strict'

var prepareNock = require('./prepareNock')

module.exports = function (courier, number) {
  var trackingInfo = courier.trackingInfo(number)
  if (trackingInfo.url) {
    prepareNock(trackingInfo, [courier.CODE, number].join('-'))
  } else {
    for (var key in trackingInfo) {
      var filename = [courier.CODE, number, key].join('-')
      if (typeof trackingInfo[key] === 'object') {
        prepareNock(trackingInfo[key], filename)
      } else if (typeof trackingInfo[key] === 'function') {
        prepareNock(trackingInfo[key](), filename)
      }
    }
  }
}
