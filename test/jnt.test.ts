import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const jnt = courier(COURIER.JNT.CODE)

describe(COURIER.JNT.NAME, () => {
  const deliveredNumber = 'DELIVERED'

  before(() => {
    prepare(jnt, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await jnt.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.JNT.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
