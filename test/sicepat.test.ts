import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const sicepat = courier(COURIER.SICEPAT.CODE, { apikey: 'test' })

describe(COURIER.SICEPAT.NAME, () => {
  const deliveredNumber = '123456789012'

  before(() => {
    prepare(sicepat, deliveredNumber)
  })

  it('delivered number', async () => {
    const result = await sicepat.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.SICEPAT.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
