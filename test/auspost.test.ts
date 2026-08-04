import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const auspost = courier(COURIER.AUSPOST.CODE)

describe(COURIER.AUSPOST.NAME, () => {
  const deliveredNumber = 'DELIVEREDNUM'

  before(() => {
    prepare(auspost, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await auspost.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.AUSPOST.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
