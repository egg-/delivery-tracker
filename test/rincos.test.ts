import assert from 'node:assert/strict'
import { COURIER, courier, ERROR, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const rincos = courier(COURIER.RINCOS.CODE)

describe(COURIER.RINCOS.NAME, () => {
  const deliveredNumber = 'DELIVERED'
  const releasedNumber = 'RELEASED'
  const invalidNumber = 'INVALIDNUM'

  before(() => {
    prepare(rincos, deliveredNumber)
    prepare(rincos, releasedNumber)
    prepare(rincos, invalidNumber)
  })

  it('delivered number', async () => {
    const result = await rincos.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.checkpoints.at(-1)?.status, STATUS.INFO_RECEIVED)
  })

  it('released number', async () => {
    const result = await rincos.trace(releasedNumber)

    assert.equal(result.number, releasedNumber)
    assert.equal(result.courier.code, COURIER.RINCOS.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('invalid number', async () => {
    await assert.rejects(rincos.trace(invalidNumber), {
      name: 'TrackerError',
      code: ERROR.INVALID_NUMBER
    })
  })
})
