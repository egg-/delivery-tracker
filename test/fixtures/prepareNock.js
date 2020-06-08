'use strict'

var nock = require('nock')
var url = require('url')
var path = require('path')

module.exports = function (trackingInfo, filename) {
  var info = url.parse(trackingInfo.url)
  nock([info.protocol, info.host].join('//'))[trackingInfo.method.toLowerCase()](info.path, trackingInfo.data)
    .replyWithFile(200, path.join(__dirname, '/' + filename))
}
