/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.JNT.CODE)

describe(tracker.COURIER.JNT.NAME, function () {
  var deliveredNumber = 'DELIVERED'

  before(function () {
    // @TODO add nock
    prepare(courier, deliveredNumber)
  })

  it('info received number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.JNT.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })
})
