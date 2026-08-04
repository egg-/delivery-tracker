import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const eparcel = courier(COURIER.EPARCEL.CODE)

describe(COURIER.EPARCEL.NAME, () => {
  const deliveredNumber = 'DELIVEREDNUM'
  const nodataNumber = 'NODATA'

  before(() => {
    prepare(eparcel, deliveredNumber)
    prepare(eparcel, nodataNumber)
  })

  it('delivered number', async () => {
    const result = await eparcel.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.EPARCEL.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('no data number', async () => {
    const result = await eparcel.trace(nodataNumber)

    assert.equal(result.number, nodataNumber)
    assert.equal(result.courier.code, COURIER.EPARCEL.CODE)
    assert.equal(result.status, STATUS.PENDING)
  })
})
