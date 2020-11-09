'use strict'

var nock = require('nock')
var URL = require('url').URL
var path = require('path')

module.exports = function (trackingInfo, filename) {
  var trackingUrl = new URL(trackingInfo.url)
  nock([trackingUrl.protocol, trackingUrl.host].join('//'))[trackingInfo.method.toLowerCase()](trackingUrl.pathname + trackingUrl.search, trackingInfo.data)
    .replyWithFile(200, path.join(__dirname, '/' + filename))
}
