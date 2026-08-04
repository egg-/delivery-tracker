import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const paxel = courier(COURIER.PAXEL.CODE)

describe(COURIER.PAXEL.NAME, () => {
  const deliveredNumber = 'DELIVERED'

  before(() => {
    prepare(paxel, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await paxel.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.courier.code, COURIER.PAXEL.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })
})
