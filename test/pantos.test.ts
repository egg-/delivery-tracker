import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const pantos = courier(COURIER.PANTOS.CODE)

describe(COURIER.PANTOS.NAME, () => {
  const deliveredNum = 'DELIVEREDN'
  // A shipment Pantos handed to UPS. UPS is no longer supported, so the handover is
  // skipped and only Pantos's own checkpoints come back.
  const handedOverNum = 'DELIVEREDUPS'

  before(() => {
    prepare(pantos, deliveredNum)
    prepare(pantos, handedOverNum)
  })

  it('delivered number', async () => {
    const result = await pantos.trace(deliveredNum)

    assert.equal(result.number, deliveredNum)
    assert.equal(result.courier.code, COURIER.PANTOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('handed-over number falls back to its own checkpoints', async () => {
    const result = await pantos.trace(handedOverNum)

    assert.equal(result.number, handedOverNum)
    assert.equal(result.courier.code, COURIER.PANTOS.CODE)
    assert.notEqual(result.checkpoints.length, 0)
    // Every checkpoint is Pantos's; none were merged in from the receiving carrier.
    assert.ok(result.checkpoints.every((c) => c.courier.code === COURIER.PANTOS.CODE))
  })
})
