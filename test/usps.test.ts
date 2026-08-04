import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const usps = courier(COURIER.USPS.CODE)

describe(COURIER.USPS.NAME, () => {
  const deliveredNumber = 'DELIVEREDNM'

  before(() => {
    prepare(usps, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await usps.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.courier.code, COURIER.USPS.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })
})
