/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.PANTOS.CODE)

describe(tracker.COURIER.PANTOS.NAME, function () {
  var deliveredNum = 'DELIVEREDN'
  var deliveredUPSNum = 'DELIVEREDUPS'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNum)
    prepare(courier, deliveredUPSNum)
    prepare(tracker.courier(tracker.COURIER.UPS.CODE), deliveredUPSNum)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNum, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('ups number', function (done) {
    courier.trace(deliveredUPSNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredUPSNum, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
