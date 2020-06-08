'use strict'

var prepareNock = require('./prepareNock')

module.exports = function (courier, number) {
  var trackingInfo = courier.trackingInfo(number)
  if (trackingInfo.url) {
    prepareNock(trackingInfo, [courier.CODE, number].join('-'))
  } else {
    for (var key in trackingInfo) {
      var filename = [courier.CODE, number, key].join('-')
      typeof trackingInfo[key] === 'object' && prepareNock(trackingInfo[key], filename)
    }
  }
}
