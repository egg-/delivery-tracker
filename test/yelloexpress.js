/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.YELLOEXPRESS.CODE)

describe(tracker.COURIER.YELLOEXPRESS.NAME, function () {
  var deliveredNumber = 'DELIVERED'
  var delivered2Number = 'DELIVERED2'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    prepare(courier, delivered2Number)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.YELLOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered2 number', function (done) {
    courier.trace(delivered2Number, function (err, result) {
      assert.equal(err, null)

      assert.equal(delivered2Number, result.number)
      assert.equal(tracker.COURIER.YELLOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
