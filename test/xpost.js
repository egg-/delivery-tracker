/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.XPOST.CODE)

describe(tracker.COURIER.XPOST.NAME, function () {
  var intransitNumber = 'INTRANSIT'
  var deliveredNumber = 'DELIVERED'

  before(function () {
    // @TODO add nock
    prepare(courier, intransitNumber)
    prepare(courier, deliveredNumber)
  })

  it('transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.XPOST.CODE, result.courier.code)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.XPOST.CODE, result.courier.code)

      done()
    })
  })
})
