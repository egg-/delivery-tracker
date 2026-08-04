import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const canadapost = courier(COURIER.CANADAPOST.CODE)

describe(COURIER.CANADAPOST.NAME, () => {
  const deliveredNumber = 'DELIVERED'

  before(() => {
    prepare(canadapost, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await canadapost.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.CANADAPOST.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
