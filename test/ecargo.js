/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.ECARGO.CODE)

describe(tracker.COURIER.ECARGO.NAME, function () {
  const pendingNumber = 'ESPENDING'
  const deliveredNumber = 'ESDELIVERED'
  const exceptionNumber = 'ESEXCEPTION'
  const failattemptNumber = 'ESEXCEPTION'

  before(function () {
    // @TODO add nock
    prepare(courier, pendingNumber)
    prepare(courier, deliveredNumber)
    prepare(courier, exceptionNumber)
    prepare(courier, failattemptNumber)
  })

  it('pending number', function (done) {
    courier.trace(pendingNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(pendingNumber, result.number)
      assert.equal(tracker.COURIER.ECARGO.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.ECARGO.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('exception number', function (done) {
    courier.trace(exceptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionNumber, result.number)
      assert.equal(tracker.COURIER.ECARGO.CODE, result.courier.code)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)

      done()
    })
  })

  it('fail attempt number', function (done) {
    courier.trace(failattemptNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(failattemptNumber, result.number)
      assert.equal(tracker.COURIER.ECARGO.CODE, result.courier.code)

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
