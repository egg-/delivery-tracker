/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.CESCO.CODE)

describe(tracker.COURIER.CESCO.NAME, function () {
  var pendingNum = 'PENDINGNUM'
  var intransitNum = 'INTRANSITNUM'

  before(function () {
    // @TODO add nock
    prepare(courier, pendingNum)
    prepare(courier, intransitNum)
  })

  it('delivered number', function (done) {
    courier.trace(pendingNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(pendingNum, result.number)
      assert.equal(tracker.COURIER.CESCO.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })

  it('in transit number', function (done) {
    courier.trace(intransitNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNum, result.number)
      assert.equal(tracker.COURIER.CESCO.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
