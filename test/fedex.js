/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.FEDEX.CODE)

describe(tracker.COURIER.FEDEX.NAME, function () {
  var pendingNumber = 'PENDINGNUM'
  var intransitNumber = 'DELIVEREDNUM'
  var deliveredNumber = 'DELIVEREDNUM'
  var exceptionNumber = 'EXCEPTIONNUM'

  before(function () {
    // @TODO add nock
    prepare(courier, pendingNumber)
    prepare(courier, intransitNumber)
    prepare(courier, deliveredNumber)
    prepare(courier, exceptionNumber)
  })

  it('pending number', function (done) {
    courier.trace(pendingNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(pendingNumber, result.number)
      assert.equal(tracker.COURIER.FEDEX.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })

  it('in transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.FEDEX.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.FEDEX.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('exception number', function (done) {
    courier.trace(exceptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionNumber, result.number)
      assert.equal(tracker.COURIER.FEDEX.CODE, result.courier.code)

      var exceptionCount = 0
      for (var i = 0; i < result.checkpoints.length; i++) {
        if (tracker.STATUS.EXCEPTION === result.checkpoints[i].status) {
          exceptionCount++
        }
      }
      assert.notEqual(exceptionCount, 0)

      done()
    })
  })
})
