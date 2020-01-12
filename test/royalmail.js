/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.ROYALMAIL.CODE)

describe(tracker.COURIER.ROYALMAIL.NAME, function () {
  const intransitNumber = 'LBTRANSIT'

  before(function () {
    // @TODO add nock
    prepare(courier, intransitNumber)
  })

  it('in transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.ROYALMAIL.CODE, result.courier.code)
      assert.notEqual(result.checkpoints.length, 0)

      done()
    })
  })
})
