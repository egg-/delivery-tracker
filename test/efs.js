/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.EFS.CODE)

describe(tracker.COURIER.EFS.NAME, function () {
  var infoNumber = 'EFSINFORECEIVED'

  before(function () {
    // @TODO add nock
    prepare(courier, infoNumber)
  })

  it('info received number', function (done) {
    courier.trace(infoNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(infoNumber, result.number)
      assert.equal(tracker.COURIER.EFS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.INFO_RECEIVED, result.status)

      done()
    })
  })
})
