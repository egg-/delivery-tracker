import assert from 'node:assert/strict'
import { COURIER, type CourierCode, courier } from '../src/index.js'
import prepare from './fixtures/prepare.js'

/**
 * Every courier parses dates with a hand-written format string. When a page changes its
 * layout — or a date library gets stricter — those formats fail silently and every
 * `time` becomes "Invalid Date", which the per-courier tests never looked at.
 *
 * This sweep traces one recorded shipment per courier and asserts the timestamps are
 * real, so a broken format string fails the build instead of shipping empty dates.
 */
const CASES: Array<[CourierCode, string]> = [
  [COURIER.AUSPOST.CODE, 'DELIVEREDNUM'],
  [COURIER.CANADAPOST.CODE, 'DELIVERED'],
  [COURIER.CESCO.CODE, 'DELIVEREDNUM'],
  [COURIER.CJKOREAEXPRESS.CODE, 'DELIVERED'],
  [COURIER.EFS.CODE, 'EFSINFORECEIVED'],
  [COURIER.EPARCEL.CODE, 'DELIVEREDNUM'],
  [COURIER.JNT.CODE, 'DELIVERED'],
  [COURIER.KOREAPOST.CODE, 'EBCOMPLETE0KR'],
  [COURIER.PANTOS.CODE, 'DELIVEREDN'],
  [COURIER.POSLAJU.CODE, 'DELIVERED'],
  [COURIER.RINCOS.CODE, 'DELIVERED'],
  [COURIER.ROYALMAIL.CODE, 'LBTRANSIT'],
  [COURIER.SICEPAT.CODE, '123456789012'],
  [COURIER.TNT.CODE, 'DELIVEREDNUM'],
  [COURIER.XPOST.CODE, 'DELIVERED']
]

describe('checkpoint timestamps', () => {
  for (const [code, number] of CASES) {
    it(`${code} parses every checkpoint time`, async () => {
      const client = courier(code, { apikey: 'test' })
      prepare(client, number)

      const result = await client.trace(number)
      assert.notEqual(result.checkpoints.length, 0, 'expected at least one checkpoint')

      for (const [index, checkpoint] of result.checkpoints.entries()) {
        assert.notEqual(
          checkpoint.time,
          'Invalid Date',
          `${code} checkpoint[${index}] failed to parse: ${checkpoint.message}`
        )
        // Royal Mail legitimately lists rows with no date at all.
        if (checkpoint.time !== '') {
          assert.match(
            checkpoint.time,
            /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/,
            `${code} checkpoint[${index}] has an unexpected time: ${checkpoint.time}`
          )
        }
      }
    })
  }

  it('parses Royal Mail day-first dates', async () => {
    const royalmail = courier(COURIER.ROYALMAIL.CODE)
    prepare(royalmail, 'LBTRANSIT')

    const result = await royalmail.trace('LBTRANSIT')

    // "18/01/17" + "23:53" is 18 January 2017, not 2001.
    assert.equal(result.checkpoints[1]?.time, '2017-01-18T23:53:00')
  })

  it('parses CESCO Indonesian month names', async () => {
    const cesco = courier(COURIER.CESCO.CODE)
    prepare(cesco, 'PENDINGNUM')

    const result = await cesco.trace('PENDINGNUM')

    // "Agu. 13, 2018" maps to August and carries a +0700 offset.
    assert.match(result.checkpoints[0]?.time ?? '', /^2018-08-1[23]T/)
  })
})
