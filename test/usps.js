/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.USPS.CODE)

describe(tracker.COURIER.USPS.NAME, function () {
  var deliveredNumber = 'DELIVEREDNM'
  var deadMailNumber = 'DEADMAILNM'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    prepare(courier, deadMailNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.STATUS.DELIVERED, result.status)
      assert.equal(tracker.COURIER.USPS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })

  it('dead mail', function (done) {
    courier.trace(deadMailNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deadMailNumber, result.number)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)
      assert.equal(tracker.COURIER.USPS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
