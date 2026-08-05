import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const cjkoreaexpress = courier(COURIER.CJKOREAEXPRESS.CODE)

describe(COURIER.CJKOREAEXPRESS.NAME, () => {
  // Recorded in 2020, when CJ labelled the final scan '배달완료'.
  const deliveredNumber = 'DELIVERED'
  // Recorded in 2026, after the label became '배송완료'. Matching only the older
  // spelling left delivered parcels as InTransit until they aged into Exception (#39).
  const deliveredCurrentNumber = 'DELIVERED2'

  before(() => {
    prepare(cjkoreaexpress, deliveredNumber)
    prepare(cjkoreaexpress, deliveredCurrentNumber)
  })

  it('delivered number', async () => {
    const result = await cjkoreaexpress.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.courier.code, COURIER.CJKOREAEXPRESS.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })

  it('delivered number with the current scan labels', async () => {
    const result = await cjkoreaexpress.trace(deliveredCurrentNumber)

    assert.equal(result.number, deliveredCurrentNumber)
    assert.equal(result.status, STATUS.DELIVERED)

    // Newest first, so the delivery scan leads.
    assert.equal(result.checkpoints[0]?.status, STATUS.DELIVERED)
    assert.match(result.checkpoints[0]?.message ?? '', /배송완료/)
    assert.equal(result.checkpoints.at(-1)?.status, STATUS.INFO_RECEIVED)
  })
})
