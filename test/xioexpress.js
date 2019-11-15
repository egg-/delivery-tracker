/* global before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.XIOEXPRESS.CODE)

describe(tracker.COURIER.SICEPAT.NAME, function () {
  var deliveredNumber = 'DELIVERED'
  var exceptionNumber = 'EXCEPTION'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    prepare(courier, exceptionNumber)
  })

  it('exception number', function (done) {
    courier.trace(exceptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionNumber, result.number)
      assert.equal(tracker.COURIER.XIOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.XIOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
