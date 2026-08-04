import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const fedex = courier(COURIER.FEDEX.CODE)

describe(COURIER.FEDEX.NAME, () => {
  const pendingNumber = 'PENDINGNUM'
  const intransitNumber = 'DELIVEREDNUM'
  const deliveredNumber = 'DELIVEREDNUM'
  const exceptionNumber = 'EXCEPTIONNUM'

  before(() => {
    prepare(fedex, pendingNumber)
    prepare(fedex, intransitNumber)
    prepare(fedex, deliveredNumber)
    prepare(fedex, exceptionNumber)
  })

  it('pending number', async () => {
    const result = await fedex.trace(pendingNumber)

    assert.equal(result.number, pendingNumber)
    assert.equal(result.courier.code, COURIER.FEDEX.CODE)
    assert.equal(result.status, STATUS.PENDING)
  })

  it('in transit number', async () => {
    const result = await fedex.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.FEDEX.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })

  it('delivered number', async () => {
    const result = await fedex.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.FEDEX.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('exception number', async () => {
    const result = await fedex.trace(exceptionNumber)

    assert.equal(result.number, exceptionNumber)
    assert.equal(result.courier.code, COURIER.FEDEX.CODE)

    const exceptions = result.checkpoints.filter((c) => c.status === STATUS.EXCEPTION)
    assert.notEqual(exceptions.length, 0)
  })
})
