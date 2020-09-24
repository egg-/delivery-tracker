/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var prepareNock = require('./fixtures/prepareNock')

var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.LBC.CODE)

describe(tracker.COURIER.LBC.NAME, function () {
  var deliveredNumber = 'DELIVEREDNUM'

  before(function (done) {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    courier.loadHash(deliveredNumber, function (err, hash) {
      assert.equal(err, null)
      var trackingInfo = courier.trackingInfo(deliveredNumber)

      prepare(courier, deliveredNumber)
      prepareNock(trackingInfo.checkpoints(hash), [courier.CODE, deliveredNumber, 'checkpoints'].join('-'))

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.LBC.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
