import assert from 'node:assert/strict'
import { COURIER, courier } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const royalmail = courier(COURIER.ROYALMAIL.CODE)

describe(COURIER.ROYALMAIL.NAME, () => {
  const intransitNumber = 'LBTRANSIT'

  before(() => {
    prepare(royalmail, intransitNumber)
  })

  it('in transit number', async () => {
    const result = await royalmail.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.ROYALMAIL.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })
})
