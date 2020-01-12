/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.CJKOREAEXPRESS.CODE)

describe(tracker.COURIER.CJKOREAEXPRESS.NAME, function () {
  const deliveredNumber = 'DELIVERED'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.STATUS.DELIVERED, result.status)
      assert.equal(tracker.COURIER.CJKOREAEXPRESS.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
