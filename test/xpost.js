/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.XPOST.CODE)

describe(tracker.COURIER.XPOST.NAME, function () {
  const intransitNumber = 'INTRANSIT'
  const deliveredNumber = 'DELIVERED'

  before(function () {
    // @TODO add nock
    prepare(courier, intransitNumber)
    prepare(courier, deliveredNumber)
  })

  it('transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.XPOST.CODE, result.courier.code)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.XPOST.CODE, result.courier.code)

      done()
    })
  })
})
