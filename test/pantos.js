/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.PANTOS.CODE)

describe(tracker.COURIER.PANTOS.NAME, function () {
  var deliveredNum = 'DELIVEREDN'
  var exceptionUPSNum = 'EXCEPTIONUPS'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNum)
    prepare(courier, exceptionUPSNum)
    prepare(tracker.courier(tracker.COURIER.UPS.CODE), exceptionUPSNum)
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
    courier.trace(exceptionUPSNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionUPSNum, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)

      done()
    })
  })
})
