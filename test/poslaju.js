/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.POSLAJU.CODE)

describe(tracker.COURIER.POSLAJU.NAME, function () {
  var intransitNumber = 'INTRANSIT'
  var deliveredNumber = 'DELIVERED'
  var deliveredType2Number = 'DELIVERED-2'

  before(function () {
    // @TODO add nock
    prepare(courier, intransitNumber)
    prepare(courier, deliveredNumber)
    prepare(courier, deliveredType2Number)
  })

  it('intransit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.POSLAJU.CODE, result.courier.code)
      assert.equal(tracker.STATUS.IN_TRANSIT, result.checkpoints[0].status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.POSLAJU.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered type 2 number', function (done) {
    courier.trace(deliveredType2Number, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredType2Number, result.number)
      assert.equal(tracker.COURIER.POSLAJU.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
