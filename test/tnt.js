/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.TNT.CODE)

describe(tracker.COURIER.TNT.NAME, function () {
  const deliveredNum = 'DELIVEREDNUM'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNum)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNum, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNum, result.number)
      assert.equal(tracker.COURIER.TNT.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
