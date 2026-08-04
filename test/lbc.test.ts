import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COURIER, courier, STATUS, type TrackingRequestFactory } from '../src/index.js'
import prepare from './fixtures/prepare.js'
import prepareNock from './fixtures/prepareNock.js'

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

const lbc = courier(COURIER.LBC.CODE)

describe(COURIER.LBC.NAME, () => {
  const deliveredNumber = 'DELIVEREDNUM'

  before(() => {
    // The checkpoints URL embeds a hash the search endpoint returns, so the second
    // interceptor has to be built from the recorded hash rather than a placeholder.
    const recorded = fs.readFileSync(
      path.join(fixturesDir, `${lbc.code}-${deliveredNumber}-hash`),
      'utf8'
    )
    const { hash } = JSON.parse(recorded) as { hash: string }

    prepare(lbc, deliveredNumber)

    const info = lbc.trackingInfo(deliveredNumber) as Record<string, TrackingRequestFactory>
    prepareNock(info.checkpoints(hash), `${lbc.code}-${deliveredNumber}-checkpoints`)
  })

  it('delivered number', async () => {
    const result = await lbc.trace(deliveredNumber)

    assert.equal(result.number, deliveredNumber)
    assert.equal(result.courier.code, COURIER.LBC.CODE)
    assert.equal(result.status, STATUS.DELIVERED)
  })
})
