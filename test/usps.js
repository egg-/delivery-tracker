/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.USPS.CODE)

describe(tracker.COURIER.USPS.NAME, function () {
  const deliveredNumber = 'DELIVEREDNM'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.STATUS.DELIVERED, result.status)
      assert.equal(tracker.COURIER.USPS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
