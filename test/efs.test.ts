import assert from 'node:assert/strict'
import { COURIER, courier, STATUS } from '../src/index.js'
import prepare from './fixtures/prepare.js'

const efs = courier(COURIER.EFS.CODE)

describe(COURIER.EFS.NAME, () => {
  const infoNumber = 'EFSINFORECEIVED'

  before(() => {
    prepare(efs, infoNumber)
  })

  it('info received number', async () => {
    const result = await efs.trace(infoNumber)

    assert.equal(result.number, infoNumber)
    assert.equal(result.courier.code, COURIER.EFS.CODE)
    assert.equal(result.status, STATUS.INFO_RECEIVED)
  })
})
