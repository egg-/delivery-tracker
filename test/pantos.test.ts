import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const pantos = courier(COURIER.PANTOS.CODE)

describe(COURIER.PANTOS.NAME, () => {
  const deliveredNum = 'DELIVEREDN'
  const deliveredUPSNum = 'DELIVEREDUPS'

  before(() => {
    prepare(pantos, deliveredNum)
    prepare(pantos, deliveredUPSNum)
    prepare(courier(COURIER.UPS.CODE), deliveredUPSNum)
  })

  it('delivered number', async () => {
    const result = await pantos.trace(deliveredNum)

    assert.equal(result.number, deliveredNum)
    assert.equal(result.courier.code, COURIER.PANTOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('ups number', async () => {
    const result = await pantos.trace(deliveredUPSNum)

    assert.equal(result.number, deliveredUPSNum)
    assert.equal(result.courier.code, COURIER.PANTOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
