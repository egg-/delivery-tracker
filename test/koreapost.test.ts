import assert from 'node:assert/strict'
import { COURIER, courier, ERROR, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const koreapost = courier(COURIER.KOREAPOST.CODE)

describe(COURIER.KOREAPOST.NAME, () => {
  const invalidNumber = 'INVALIDNUM0KR'
  const pendingNumber = 'EBPENDING00KR'
  const intransitNumber = 'EBINTRANSITKR'
  const deliveredNumber = 'EBCOMPLETE0KR'
  const finalDeliveryNumber = 'EBCOMPLETE1KR'
  const exceptionNumber = 'EYEXCEPTIONKR'
  const failattemptNumber = 'EYEXCEPTIONKR'

  before(() => {
    prepare(koreapost, invalidNumber)
    prepare(koreapost, pendingNumber)
    prepare(koreapost, intransitNumber)
    prepare(koreapost, deliveredNumber)
    prepare(koreapost, finalDeliveryNumber)
    prepare(koreapost, exceptionNumber)
    prepare(koreapost, failattemptNumber)
  })

  it('invalid number', async () => {
    await assert.rejects(koreapost.trace(invalidNumber), {
      name: 'TrackerError',
      code: ERROR.INVALID_NUMBER_HEADER
    })
  })

  it('pending number', async () => {
    const result = await koreapost.trace(pendingNumber)

    assert.equal(result.number, pendingNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)
    assert.equal(result.status, STATUS.PENDING)
  })

  it('in transit number', async () => {
    const result = await koreapost.trace(intransitNumber)

    assert.equal(result.number, intransitNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)
    assert.notEqual(result.checkpoints.length, 0)
  })

  it('delivered number', async () => {
    const result = await koreapost.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('finally delivered number', async () => {
    const result = await koreapost.trace(finalDeliveryNumber)

    assert.equal(result.number, finalDeliveryNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })

  it('exception number', async () => {
    const result = await koreapost.trace(exceptionNumber)

    assert.equal(result.number, exceptionNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)
    assert.equal(result.status, STATUS.EXCEPTION)
  })

  it('fail attempt number', async () => {
    const result = await koreapost.trace(failattemptNumber)

    assert.equal(result.number, failattemptNumber)
    assert.equal(result.courier.code, COURIER.KOREAPOST.CODE)

    const attempts = result.checkpoints.filter((c) => c.status === STATUS.FAIL_ATTEMPT)
    assert.notEqual(attempts.length, 0)
  })
})
