import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const cjkoreaexpress = courier(COURIER.CJKOREAEXPRESS.CODE)

describe(COURIER.CJKOREAEXPRESS.NAME, () => {
  const deliveredNumber = 'DELIVERED'

  before(() => {
    prepare(cjkoreaexpress, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await cjkoreaexpress.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.courier.code, COURIER.CJKOREAEXPRESS.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })
})
