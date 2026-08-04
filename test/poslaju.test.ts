import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const poslaju = courier(COURIER.POSLAJU.CODE)

describe(COURIER.POSLAJU.NAME, () => {
  const intransitNumber = 'INTRANSIT'
  const deliveredNumber = 'DELIVERED'
  const deliveredType2Number = 'DELIVERED-2'

  before(() => {
    prepare(poslaju, intransitNumber)
    prepare(poslaju, deliveredNumber)
    prepare(poslaju, deliveredType2Number)
  })

  it('intransit number', async () => {
    const result = await poslaju.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.POSLAJU.CODE)
    assert.equal(result.checkpoints[0]?.status, STATUS.IN_TRANSIT)
  })

  it('delivered number', async () => {
    const result = await poslaju.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.POSLAJU.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('delivered type 2 number', async () => {
    const result = await poslaju.trace(deliveredType2Number)

    assert.equal(result.number, deliveredType2Number)
    assert.equal(result.courier.code, COURIER.POSLAJU.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
