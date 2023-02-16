/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.PAXEL.CODE)

describe(tracker.COURIER.PAXEL.NAME, function () {
  var deliveredNumber = 'DELIVERED'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.STATUS.DELIVERED, result.status)
      assert.equal(tracker.COURIER.PAXEL.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
