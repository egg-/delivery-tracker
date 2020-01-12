/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.AUSPOST.CODE)

describe(tracker.COURIER.AUSPOST.NAME, function () {
  const deliveredNumber = 'DELIVEREDNUM'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.AUSPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
