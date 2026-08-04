import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const cesco = courier(COURIER.CESCO.CODE)

describe(COURIER.CESCO.NAME, () => {
  const pendingNum = 'PENDINGNUM'
  const intransitNum = 'INTRANSITNUM'
  const deliveredNum = 'DELIVEREDNUM'

  before(() => {
    prepare(cesco, pendingNum)
    prepare(cesco, intransitNum)
    prepare(cesco, deliveredNum)
  })

  it('pending number', async () => {
    const result = await cesco.trace(pendingNum)

    assert.equal(result.number, pendingNum)
    assert.equal(result.courier.code, COURIER.CESCO.CODE)
    assert.equal(result.status, STATUS.PENDING)
  })

  it('in transit number', async () => {
    const result = await cesco.trace(intransitNum)

    assert.equal(result.number, intransitNum)
    assert.equal(result.courier.code, COURIER.CESCO.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })

  it('delivered number', async () => {
    const result = await cesco.trace(deliveredNum)

    assert.equal(result.number, deliveredNum)
    assert.equal(result.courier.code, COURIER.CESCO.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })
})
