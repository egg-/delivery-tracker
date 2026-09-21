import { ERROR, type TrackingRequest, trackerError } from './core.js'

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string | string[]>
  body: string
}

function toHeaderObject(headers: Headers): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  headers.forEach((value, key) => {
    result[key] = key === 'set-cookie' ? headers.getSetCookie() : value
  })
  return result
}

function buildBody(opts: TrackingRequest): { body?: RequestInit['body']; type?: string } {
  if (opts.form) {
    return {
      body: new URLSearchParams(opts.form).toString(),
      type: 'application/x-www-form-urlencoded'
    }
  }
  if (opts.formData) {
    // FormData sets its own multipart boundary, so we must not set content-type.
    const form = new FormData()
    for (const [key, value] of Object.entries(opts.formData)) {
      form.append(key, value)
    }
    return { body: form }
  }
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') {
      return { body: opts.body }
    }
    return { body: JSON.stringify(opts.body), type: 'application/json' }
  }
  return {}
}

// `rejectUnauthorized: false` cannot be expressed through the default fetch dispatcher.
// Only cesco needs it (its certificate is still invalid), so build the agent on demand.
type Dispatcher = NonNullable<RequestInit['dispatcher']>

let insecureDispatcher: Dispatcher | null = null
async function getInsecureDispatcher(): Promise<Dispatcher> {
  if (insecureDispatcher === null) {
    const { Agent } = await import('undici')
    insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } }) as Dispatcher
  }
  return insecureDispatcher
}

/** One HTTP round trip. Non-2xx responses come back normally — callers decide. */
export async function request(opts: TrackingRequest, cookies?: CookieJar): Promise<HttpResponse> {
  const headers: Record<string, string> = { ...opts.headers }
  const payload = buildBody(opts)

  if (payload.type && !headers['content-type'] && !headers['Content-Type']) {
    headers['content-type'] = payload.type
  }
  if (opts.json && !headers.accept && !headers.Accept) {
    headers.accept = 'application/json'
  }

  const cookieHeader = cookies?.header()
  if (cookieHeader) {
    headers.cookie = cookieHeader
  }

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers
  }
  if (payload.body !== undefined) {
    init.body = payload.body
  }
  if (opts.rejectUnauthorized === false) {
    init.dispatcher = await getInsecureDispatcher()
  }

  const response = await fetch(opts.url, init)
  const body = await response.text()

  cookies?.store(response.headers.getSetCookie())

  return {
    status: response.status,
    statusText: response.statusText,
    headers: toHeaderObject(response.headers),
    body
  }
}

/**
 * Fails on a response the courier did not mean as an answer. A scraper that skips this
 * reads an error page as if it were tracking data, and reports whatever the parser makes
 * of the missing fields — usually an empty result, or a `TypeError` from deep inside.
 */
export function ensureOk(response: HttpResponse): HttpResponse {
  if (response.status >= 200 && response.status < 300) {
    return response
  }
  if (response.status === 400 || response.status === 404) {
    throw trackerError(ERROR.INVALID_NUMBER)
  }
  if (response.status === 401 || response.status === 403) {
    throw trackerError(ERROR.REQUIRED_APIKEY)
  }
  throw trackerError(ERROR.SERVER_ERROR, `${response.status} ${response.statusText}`.trim())
}

/** Parses a JSON response, turning malformed bodies into a caller-friendly failure. */
export function parseJson<T>(response: HttpResponse): T {
  try {
    return JSON.parse(response.body) as T
  } catch {
    throw trackerError(
      ERROR.SERVER_ERROR,
      `expected JSON, got ${response.status} ${response.statusText}`.trim()
    )
  }
}

/**
 * Minimal cookie carrier for couriers that must land on a page before calling its API.
 * It replays name=value pairs and nothing else — no domain, path, or expiry handling.
 * ponytail: enough for pantos and ups; reach for a real jar if a courier needs scoping.
 */
export class CookieJar {
  private readonly pairs: string[] = []

  header(): string | undefined {
    return this.pairs.length > 0 ? this.pairs.join('; ') : undefined
  }

  store(setCookie: string[]): void {
    for (const cookie of setCookie) {
      const pair = cookie.split(';')[0]
      if (pair) {
        this.pairs.push(pair)
      }
    }
  }
}

/** A cookie-carrying request function, for multi-step courier flows. */
export function createSession(): (opts: TrackingRequest) => Promise<HttpResponse> {
  const jar = new CookieJar()
  return (opts: TrackingRequest) => request(opts, jar)
}
