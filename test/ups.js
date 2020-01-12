/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.UPS.CODE)

describe(tracker.COURIER.UPS.NAME, function () {
  const deliveredNum = 'DELIVEREDUPS'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNum)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNum, result.number)
      assert.equal(tracker.COURIER.UPS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
