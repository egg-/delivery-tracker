import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const ups = courier(COURIER.UPS.CODE)

describe(COURIER.UPS.NAME, () => {
  const deliveredNum = 'DELIVEREDUPS'

  before(() => {
    prepare(ups, deliveredNum)
  })

  it('delivered number', async () => {
    const result = await ups.trace(deliveredNum)

    assert.equal(result.number, deliveredNum)
    assert.equal(result.courier.code, COURIER.UPS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
