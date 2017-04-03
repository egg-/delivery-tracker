/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.USPS.CODE)

describe(tracker.COURIER.USPS.NAME, function () {
  var inforeceivedNumber = 'INFORECEIVED'
  var intransitNumber = 'INTRANSIT'

  before(function () {
    // @TODO add nock
    prepare(courier, inforeceivedNumber)
    prepare(courier, intransitNumber)
  })

  it('info received number', function (done) {
    courier.trace(inforeceivedNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(inforeceivedNumber, result.number)
      assert.equal(tracker.STATUS.INFO_RECEIVED, result.status)
      assert.equal(tracker.COURIER.USPS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })

  it('in transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.USPS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
