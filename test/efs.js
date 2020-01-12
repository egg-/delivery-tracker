/* globals before it describe */

'use strict'

const assert = require('assert')

const prepare = require('./fixtures/prepare')
const tracker = require('../')

const courier = tracker.courier(tracker.COURIER.EFS.CODE)

describe(tracker.COURIER.EFS.NAME, function () {
  const infoNumber = 'EFSINFORECEIVED'

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
