/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.KERRYTHAI.CODE)

describe(tracker.COURIER.KERRYTHAI.NAME, function () {
  var exeptionNumber = 'EXCEPTIONTHAI'

  before(function () {
    // @TODO add nock
    prepare(courier, exeptionNumber)
  })

  it('delivered number', function (done) {
    courier.trace(exeptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exeptionNumber, result.number)
      assert.equal(tracker.COURIER.KERRYTHAI.CODE, result.courier.code)

      done()
    })
  })
})
