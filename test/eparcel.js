/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.EPARCEL.CODE)

describe(tracker.COURIER.EPARCEL.NAME, function () {
  var intransitNumber = 'INTRANSIT'
  var nodataNumber = 'NODATA'

  before(function () {
    // @TODO add nock
    prepare(courier, intransitNumber)
    prepare(courier, nodataNumber)
  })

  it('transit number', function (done) {
    courier.trace(intransitNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(intransitNumber, result.number)
      assert.equal(tracker.COURIER.EPARCEL.CODE, result.courier.code)
      assert.equal(tracker.STATUS.IN_TRANSIT, result.status)

      done()
    })
  })
  it('no data number', function (done) {
    courier.trace(nodataNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(nodataNumber, result.number)
      assert.equal(tracker.COURIER.EPARCEL.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })
})
