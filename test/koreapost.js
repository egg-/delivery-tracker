/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.KOREAPOST.CODE)

describe(tracker.COURIER.KOREAPOST.NAME, function () {
  var invalidNumber = 'INVALIDNUM0KR'
  var pendingNumber = 'EBPENDING00KR'
  var intransitNumber = 'EBINTRANSITKR'
  var deliveredNumber = 'EBCOMPLETE0KR'
  var exceptionNumber = 'EYEXCEPTIONKR'
  var failattemptNumber = 'EYEXCEPTIONKR'

  before(function () {
    // @TODO add nock
    prepare.koreapost(invalidNumber)
    prepare.koreapost(pendingNumber)
    prepare.koreapost(intransitNumber)
    prepare.koreapost(deliveredNumber)
    prepare.koreapost(exceptionNumber)
    prepare.koreapost(failattemptNumber)
  })

  it('invalid number', function (done) {
    courier.trace(invalidNumber, function (err, result) {
      assert.equal(err.code, tracker.ERROR.INVALID_NUMBER_HEADER)
      done()
    })
  })

  it('pending number', function (done) {
    courier.trace(pendingNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(pendingNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })

  it('in transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('exception number', function (done) {
    courier.trace(exceptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)
      done()
    })
  })

  it('fail attempt number', function (done) {
    courier.trace(failattemptNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(failattemptNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)

      var attemptCount = 0
      for (var i = 0; i < result.checkpoints.length; i++) {
        if (tracker.STATUS.FAIL_ATTEMPT === result.checkpoints[i].status) {
          attemptCount++
        }
      }
      assert.notEqual(attemptCount, 0)

      done()
    })
  })
})
