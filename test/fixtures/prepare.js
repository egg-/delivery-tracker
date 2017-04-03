'use strict'

var nock = require('nock')
var url = require('url')
var path = require('path')

var prepareNock = function (trackingInfo, filename) {
  var info = url.parse(trackingInfo.url)
  nock([info.protocol, info.host].join('//'))[trackingInfo.method.toLowerCase()](info.path, trackingInfo.data)
    .replyWithFile(200, path.join(__dirname, '/' + filename))
}

module.exports = function (courier, number) {
  var trackingInfo = courier.trackingInfo(number)
  if (trackingInfo.url) {
    prepareNock(trackingInfo, [courier.CODE, number].join('-'))
  } else {
    for (var key in trackingInfo) {
      var filename = [courier.CODE, number, key].join('-')
      prepareNock(trackingInfo[key], filename)
    }
  }
}
