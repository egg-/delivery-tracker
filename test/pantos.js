/* globals before it describe */

'use strict'

var assert = require('assert')

var prepare = require('./fixtures/prepare')
var tracker = require('../')

var courier = tracker.courier(tracker.COURIER.PANTOS.CODE)

describe(tracker.COURIER.PANTOS.NAME, function () {
  var deliveredFedexNumber = 'DELIVEREDNUM-FEDEX'
  var deliveredAuspostNumber = 'DELIVEREDNUM-AUSPOST'

  before(function () {
    // @TODO add nock
    prepare.pantos(deliveredFedexNumber)
    prepare.pantos(deliveredAuspostNumber)
    prepare.fedex('DELIVEREDNUM')
    prepare.auspost('DELIVEREDNUM')
  })

  it('delivered fedex number', function (done) {
    courier.trace(deliveredFedexNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredFedexNumber, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      var fedexCount = 0
      for (var i = 0; i < result.checkpoints.length; i++) {
        if (tracker.COURIER.FEDEX.CODE === result.checkpoints[i].courier.code) {
          fedexCount++
        }
      }
      assert.notEqual(fedexCount, 0)

      done()
    })
  })

  it('delivered australia post number', function (done) {
    courier.trace(deliveredAuspostNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredAuspostNumber, result.number)
      assert.equal(tracker.COURIER.PANTOS.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      var auspostCount = 0
      for (var i = 0; i < result.checkpoints.length; i++) {
        if (tracker.COURIER.AUSPOST.CODE === result.checkpoints[i].courier.code) {
          auspostCount++
        }
      }
      assert.notEqual(auspostCount, 0)

      done()
    })
  })
})
