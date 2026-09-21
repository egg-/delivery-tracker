import assert from 'node:assert/strict'
import { COURIER, courier, ERROR, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const poslaju = courier(COURIER.POSLAJU.CODE)

describe(COURIER.POSLAJU.NAME, () => {
  const intransitNumber = 'INTRANSIT'
  const deliveredNumber = 'DELIVERED'
  const invalidNumber = 'INVALIDNUM'

  before(() => {
    prepare(poslaju, intransitNumber)
    prepare(poslaju, deliveredNumber)
    prepare(poslaju, invalidNumber)
  })

  it('intransit number', async () => {
    const result = await poslaju.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.POSLAJU.CODE)
    assert.equal(result.status, STATUS.EXCEPTION)
    assert.equal(result.checkpoints[0]?.status, STATUS.IN_TRANSIT)
  })

  it('delivered number', async () => {
    const result = await poslaju.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.POSLAJU.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
    assert.equal(result.checkpoints.at(-1)?.status, STATUS.INFO_RECEIVED)
  })

  it('invalid number', async () => {
    await assert.rejects(poslaju.trace(invalidNumber), {
      name: 'TrackerError',
      code: ERROR.INVALID_NUMBER
    })
  })
})
