import assert from 'node:assert/strict'
import { COURIER, courier, ERROR, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const rincos = courier(COURIER.RINCOS.CODE)

describe(COURIER.RINCOS.NAME, () => {
  const deliveredNumber = 'DELIVERED'
  const deliverdNumber = 'DELIVERD'
  const releasedNumber = 'RELEASED'
  const invalidNumber = 'INVALIDNUM'
  const deliveredMixedNumber = 'DELIVEREDMIXED'
  const prepareNumber = 'PREPARE'

  before(() => {
    prepare(rincos, deliveredNumber)
    prepare(rincos, deliverdNumber)
    prepare(rincos, releasedNumber)
    prepare(rincos, invalidNumber)
    prepare(rincos, deliveredMixedNumber)
    prepare(rincos, prepareNumber)
  })

  it('delivered number', async () => {
    const result = await rincos.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('deliverd number', async () => {
    const result = await rincos.trace(deliverdNumber)

    assert.equal(result.number, deliverdNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('released number', async () => {
    const result = await rincos.trace(releasedNumber)

    assert.equal(result.number, releasedNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('delivered mixed number', async () => {
    const result = await rincos.trace(deliveredMixedNumber)

    assert.equal(result.number, deliveredMixedNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('invalid number', async () => {
    await assert.rejects(rincos.trace(invalidNumber), {
      name: 'TrackerError',
      code: ERROR.INVALID_NUMBER
    })
  })

  it('prepare number', async () => {
    const result = await rincos.trace(prepareNumber)

    assert.equal(result.number, prepareNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
  })
})
