/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.RINCOS.CODE)

describe(tracker.COURIER.RINCOS.NAME, function () {
  var deliveredNumber = 'DELIVERED'
  var releasedNumber = 'RELEASED'
  var invalidNumber = 'INVALIDNUM'

  before(function () {
    // @TODO add nock
    prepare.rincos(deliveredNumber)
    prepare.rincos(releasedNumber)
    prepare.rincos(invalidNumber)
  })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('delivered number', function (done) {
    courier.trace(releasedNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(releasedNumber, result.number)
      assert.equal(tracker.COURIER.RINCOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('invalid number', function (done) {
    courier.trace(invalidNumber, function (err, result) {
      assert.equal(err.code, tracker.ERROR.INVALID_NUMBER)

      done()
    })
  })
})
