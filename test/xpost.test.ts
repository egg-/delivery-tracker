import assert from 'node:assert/strict'
import { COURIER, courier } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const xpost = courier(COURIER.XPOST.CODE)

describe(COURIER.XPOST.NAME, () => {
  const intransitNumber = 'INTRANSIT'
  const deliveredNumber = 'DELIVERED'

  before(() => {
    prepare(xpost, intransitNumber)
    prepare(xpost, deliveredNumber)
  })

  it('transit number', async () => {
    const result = await xpost.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.XPOST.CODE)
  })

  it('delivered number', async () => {
    const result = await xpost.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.XPOST.CODE)
  })
})
