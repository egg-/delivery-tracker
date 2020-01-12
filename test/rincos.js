/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.RINCOS.CODE)

describe(tracker.COURIER.RINCOS.NAME, function () {
  const deliveredNumber = 'DELIVERED'
  const deliverdNumber = 'DELIVERD'
  const releasedNumber = 'RELEASED'
  const invalidNumber = 'INVALIDNUM'
  const deliveredMixedNumber = 'DELIVEREDMIXED'
  const prepareNumber = 'PREPARE'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    prepare(courier, deliverdNumber)
    prepare(courier, releasedNumber)
    prepare(courier, invalidNumber)
    prepare(courier, deliveredMixedNumber)
    prepare(courier, prepareNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('deliverd number', function (done) {
    courier.trace(deliverdNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliverdNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(releasedNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(releasedNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredMixedNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredMixedNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('invalid number', function (done) {
    courier.trace(invalidNumber, function (err, result) {
      assert.equal(err.code, tracker.ERROR.INVALID_NUMBER)

      done()
    })
  })

  it('prepare number', function (done) {
    courier.trace(prepareNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(prepareNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)

      done()
    })
  })
})
