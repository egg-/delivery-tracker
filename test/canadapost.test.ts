import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const canadapost = courier(COURIER.CANADAPOST.CODE)

describe(COURIER.CANADAPOST.NAME, () => {
  const deliveredNumber = 'DELIVERED'
  // Recorded in 2026 from the current endpoint. The parcel went back to the shipper, so
  // it also covers the `Signature` event, which carries no `locationAddr`.
  const returnedNumber = 'RETURNEDNUM'

  before(() => {
    prepare(canadapost, deliveredNumber)
    prepare(canadapost, returnedNumber)
    prepare(canadapost, returnedNumber)
    prepare(canadapost, returnedNumber)
  })

  it('delivered number', async () => {
    const result = await canadapost.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.CANADAPOST.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('returned number', async () => {
    const result = await canadapost.trace(returnedNumber)

    assert.equal(result.number, returnedNumber)
    // The hand-back to the shipper is reported as a `Delivered` event, so without the
    // `returnedToSender` flag the parcel would look successfully delivered.
    assert.equal(result.status, STATUS.RETURNED)
    assert.equal(result.checkpoints.length, 17)
  })

  it('keeps events that carry no location', async () => {
    const result = await canadapost.trace(returnedNumber)

    const signature = result.checkpoints.find((c) => c.message === 'Signature available')
    assert.ok(signature, 'expected the Signature event to survive parsing')
    assert.equal(signature.location, '')
  })

  it('marks a failed delivery attempt', async () => {
    const result = await canadapost.trace(returnedNumber)

    const attempts = result.checkpoints.filter((c) => c.status === STATUS.FAIL_ATTEMPT)
    assert.notEqual(attempts.length, 0)
  })
})
