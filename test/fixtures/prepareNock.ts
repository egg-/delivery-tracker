import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import type { TrackingRequest } from '../../src/core.js'

const fixturesDir = path.dirname(fileURLToPath(import.meta.url))

/** Replays a recorded response file for the exact request a courier is about to make. */
export default function prepareNock(
  tracking: TrackingRequest,
  filename: string,
  number?: string
): void {
  const url = new URL(tracking.url)
  const method = (tracking.method ?? 'GET').toLowerCase() as 'get' | 'post'
  const payload = tracking.data ?? tracking.form ?? tracking.formData ?? tracking.body

  // Several couriers post to one URL for every number, so matching on the path alone
  // would hand a test whichever fixture happened to be registered first. Match on the
  // number appearing in the body instead — the parts around it vary between steps.
  const body =
    number !== undefined && payload !== undefined
      ? (sent: unknown) => JSON.stringify(sent ?? '').includes(number)
      : tracking.data

  nock(`${url.protocol}//${url.host}`)
    [method](url.pathname + url.search, body)
    .replyWithFile(200, path.join(fixturesDir, filename))
}
