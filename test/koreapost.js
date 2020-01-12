/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.KOREAPOST.CODE)

describe(tracker.COURIER.KOREAPOST.NAME, function () {
  const invalidNumber = 'INVALIDNUM0KR'
  const pendingNumber = 'EBPENDING00KR'
  const intransitNumber = 'EBINTRANSITKR'
  const deliveredNumber = 'EBCOMPLETE0KR'
  const finalDeliveryNumber = 'EBCOMPLETE1KR'
  const exceptionNumber = 'EYEXCEPTIONKR'
  const failattemptNumber = 'EYEXCEPTIONKR'

  before(function () {
    // @TODO add nock
    prepare(courier, invalidNumber)
    prepare(courier, pendingNumber)
    prepare(courier, intransitNumber)
    prepare(courier, deliveredNumber)
    prepare(courier, finalDeliveryNumber)
    prepare(courier, exceptionNumber)
    prepare(courier, failattemptNumber)
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

  it('finally delivered number', function (done) {
    courier.trace(finalDeliveryNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(finalDeliveryNumber, result.number)
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

      let attemptCount = 0
      for (let i = 0; i < result.checkpoints.length; i++) {
        if (tracker.STATUS.FAIL_ATTEMPT === result.checkpoints[i].status) {
          attemptCount++
        }
      }
      assert.notEqual(attemptCount, 0)

      done()
    })
  })
})
