import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const tnt = courier(COURIER.TNT.CODE)

describe(COURIER.TNT.NAME, () => {
  const deliveredNum = 'DELIVEREDNUM'

  before(() => {
    prepare(tnt, deliveredNum)
  })

  it('delivered number', async () => {
    const result = await tnt.trace(deliveredNum)

    assert.equal(result.number, deliveredNum)
    assert.equal(result.courier.code, COURIER.TNT.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
