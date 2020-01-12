/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.CESCO.CODE)

describe(tracker.COURIER.CESCO.NAME, function () {
  const pendingNum = 'PENDINGNUM'
  const intransitNum = 'INTRANSITNUM'
  const deliveredNum = 'DELIVEREDNUM'

  before(function () {
    // @TODO add nock
    prepare(courier, pendingNum)
    prepare(courier, intransitNum)
    prepare(courier, deliveredNum)
  })

  it('peding number', function (done) {
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

  it('delivered number', function (done) {
    courier.trace(deliveredNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNum, result.number)
      assert.equal(tracker.COURIER.CESCO.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
