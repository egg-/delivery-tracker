/* globals before it describe */

'use strict'

var assert = require('assert')
var nock = require('nock')
var url = require('url')

var tracker = require('../')
var courier = tracker.courier(tracker.COURIER.PANTOS.CODE)

var prepareNock = function (number) {
  var trackingInfo = courier.trackingInfo(number)
  for (var key in trackingInfo) {
    var info = url.parse(trackingInfo[key].url)
    nock([info.protocol, info.host].join('//'))[trackingInfo[key].method.toLowerCase()](info.path, trackingInfo[key].data)
      .replyWithFile(200, __dirname + '/source/pantos-' + number + '-' + key + '.xml')
  }
}

describe(tracker.COURIER.PANTOS.NAME, function () {
  var deliveredFedexNumber = 'DELIVEREDNUM-FEDEX'
  var deliveredAuspostNumber = 'DELIVEREDNUM-AUSPOST'

  before(function () {
    // @TODO add nock
    prepareNock(deliveredFedexNumber)
    prepareNock(deliveredAuspostNumber)
  })

  it('delivered fedex number', function (done) {
    courier.trace(deliveredFedexNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredFedexNumber, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered australia post number', function (done) {
    courier.trace(deliveredAuspostNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredAuspostNumber, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
