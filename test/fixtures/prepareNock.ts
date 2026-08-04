import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import type { TrackingRequest } from '../../src/core.js'

const fixturesDir = path.dirname(fileURLToPath(import.meta.url))

/** Replays a recorded response file for the exact request a courier is about to make. */
export default function prepareNock(tracking: TrackingRequest, filename: string): void {
  const url = new URL(tracking.url)
  const method = (tracking.method ?? 'GET').toLowerCase() as 'get' | 'post'

  nock(`${url.protocol}//${url.host}`)
    [method](url.pathname + url.search, tracking.data)
    .replyWithFile(200, path.join(fixturesDir, filename))
}
