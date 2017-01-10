/* globals before it describe */

'use strict'

var assert = require('assert')
var nock = require('nock')
var url = require('url')

var tracker = require('../')
var courier = tracker.courier(tracker.COURIER.KOREAPOST.CODE)

var prepareNock = function (number) {
  var trackingInfo = courier.trackingInfo(number)
  var info = url.parse(trackingInfo.url)
  nock([info.protocol, info.host].join('//'))[trackingInfo.method.toLowerCase()](info.path, trackingInfo.data)
    .replyWithFile(200, __dirname + '/source/koreapost-' + number + '.html')
}

describe(tracker.COURIER.KOREAPOST.NAME, function () {
  var invalidNumber = 'INVALIDNUM0KR'
  var pendingNumber = 'EBPENDING00KR'
  var intransitNumber = 'EBINTRANSITKR'
  var deliveredNumber = 'EBCOMPLETE0KR'
  var exceptionNumber = 'EYEXCEPTIONKR'

  before(function () {
    // @TODO add nock
    prepareNock(invalidNumber)
    prepareNock(pendingNumber)
    prepareNock(intransitNumber)
    prepareNock(deliveredNumber)
    prepareNock(exceptionNumber)
  })

  it('invalid number', function (done) {
    courier.trace(invalidNumber, function (err, result) {
      assert.equal(err.code, tracker.ERROR.INVALID_NUMBER_HEADER)
      done()
    })
  })

  it('pending number', function (done) {
    courier.trace(pendingNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(pendingNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.PENDING, result.status)

      done()
    })
  })

  // not available
  // it('in transit number', function (done) {
  //   courier.trace(intransitNumber, function (err, result) {
  //     assert.equal(err, null)
  //
  //     assert.equal(intransitNumber, result.number)
  //     assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
  //     assert.equal(tracker.STATUS.IN_TRANSIT, result.status)
  //     done()
  //   })
  // })

  it('delivered number', function (done) {
    courier.trace(deliveredNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(deliveredNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.DELIVERED, result.status)

      done()
    })
  })

  it('exception number', function (done) {
    courier.trace(exceptionNumber, function (err, result) {
      assert.equal(err, null)

      assert.equal(exceptionNumber, result.number)
      assert.equal(tracker.COURIER.KOREAPOST.CODE, result.courier.code)
      assert.equal(tracker.STATUS.EXCEPTION, result.status)
      done()
    })
  })
})
