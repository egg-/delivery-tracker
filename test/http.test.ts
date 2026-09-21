import assert from 'node:assert/strict'
import { ERROR, ensureOk, type HttpResponse, parseJson } from '../src/index.js'

function response(status: number, body = '', statusText = ''): HttpResponse {
  return { status, statusText, headers: {}, body }
}

describe('http', () => {
  it('passes a 2xx response through', () => {
    const ok = response(200, '{}')
    assert.equal(ensureOk(ok), ok)
  })

  it('reads a rejected request as the failure it is', () => {
    // An error page is not tracking data: without this every scraper below would
    // parse it, and report an empty result or a TypeError from deep inside.
    assert.throws(() => ensureOk(response(404)), { code: ERROR.INVALID_NUMBER })
    assert.throws(() => ensureOk(response(400)), { code: ERROR.INVALID_NUMBER })
    assert.throws(() => ensureOk(response(401)), { code: ERROR.REQUIRED_APIKEY })
    assert.throws(() => ensureOk(response(403)), { code: ERROR.REQUIRED_APIKEY })
    assert.throws(() => ensureOk(response(503, '', 'Service Unavailable')), {
      code: ERROR.SERVER_ERROR,
      message: '503 Service Unavailable'
    })
  })

  it('reports a non-JSON body as a server error, not a syntax error', () => {
    assert.throws(() => parseJson(response(403, '<!DOCTYPE html>', 'Forbidden')), {
      name: 'TrackerError',
      code: ERROR.SERVER_ERROR
    })
  })

  it('parses a JSON body', () => {
    assert.deepEqual(parseJson(response(200, '{"a":1}')), { a: 1 })
  })
})
