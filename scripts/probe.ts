/**
 * Asks every courier about a number that does not exist, and reports what came back.
 *
 * A green test run only proves the parsers still handle the responses recorded in
 * `test/fixtures`. This talks to the couriers themselves, so the status table in the
 * README can be re-derived instead of trusted: `npm run probe [code...]`.
 *
 * A courier that answers "invalid number" is reachable and parsing; one that answers a
 * server error has moved, closed, or decided not to serve automated clients.
 */
import { COURIER, courier, type CourierCode, ERROR, TrackerError } from '../src/index.js'

/** Shaped like each courier's own numbers, so a rejection means "unknown", not "malformed". */
const NUMBERS: Record<string, string> = {
  auspost: '7XX1000000000000000',
  canadapost: '1234567890123456',
  cesco: 'CES1234567890',
  cjkoreaexpress: '123456789012',
  dhl: '1234567890',
  efs: '1234567890',
  eparcel: '1234567890',
  jnt: '1234567890',
  koreapost: 'EE123456789KR',
  lbc: '1234567890',
  pantos: 'PKR000000000',
  poslaju: 'EP123456789MY',
  rincos: 'RSVE0000000KR',
  sicepat: '000123456789',
  tnt: '123456789',
  xpost: '1234567890'
}

const codes = process.argv.slice(2)
const targets = (Object.values(COURIER).map((meta) => meta.CODE) as CourierCode[]).filter(
  (code) => codes.length === 0 || codes.includes(code)
)

let broken = 0

for (const code of targets) {
  const started = Date.now()
  let outcome: string

  try {
    const result = await courier(code, { apikey: 'probe' }).trace(NUMBERS[code] ?? '1234567890')
    outcome = `answers    ${result.status}, ${result.checkpoints.length} checkpoint(s)`
  } catch (err) {
    const error = err as TrackerError
    if (error.code === ERROR.INVALID_NUMBER || error.code === ERROR.INVALID_NUMBER_HEADER) {
      outcome = 'answers    rejects an unknown number'
    } else if (error.code === ERROR.REQUIRED_APIKEY) {
      outcome = 'needs key  rejected the probe key'
    } else {
      broken += 1
      outcome = `BROKEN     ${error.message}`
    }
  }

  console.log(`${code.padEnd(15)} ${outcome} (${Date.now() - started}ms)`)
}

console.log(`\n${targets.length - broken}/${targets.length} answered.`)
