/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.YELLOEXPRESS.CODE)

describe(tracker.COURIER.YELLOEXPRESS.NAME, function () {
  const deliveredNumber = 'DELIVERED'
  const delivered2Number = 'DELIVERED2'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
    prepare(courier, delivered2Number)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.YELLOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered2 number', function (done) {
    courier.trace(delivered2Number, function (err, result) {
      assert.equal(err, null)

      assert.equal(delivered2Number, result.number)
      assert.equal(tracker.COURIER.YELLOEXPRESS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
