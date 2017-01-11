/* globals before it describe */

'use strict'

var assert = require('assert')
var nock = require('nock')
var url = require('url')

var tracker = require('../')
var courier = tracker.courier(tracker.COURIER.AUSPOST.CODE)

var prepareNock = function (number) {
  var trackingInfo = courier.trackingInfo(number)
  var info = url.parse(trackingInfo.url)
  nock([info.protocol, info.host].join('//'))[trackingInfo.method.toLowerCase()](info.path, trackingInfo.data)
    .replyWithFile(200, __dirname + '/fixtures/auspost-' + number + '.json')
}

describe(tracker.COURIER.AUSPOST.NAME, function () {
  var deliveredNumber = 'DELIVEREDNUM'

  before(function () {
    // @TODO add nock
    prepareNock(deliveredNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.AUSPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
