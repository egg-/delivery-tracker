import {
  type Checkpoint,
  COURIER,
  type Courier,
  createCourier,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingInfo,
  type TrackingRequest,
  trackerError
} from '../core.js'
import dayjs from '../dayjs.js'
import { createSession, parseJson } from '../http.js'

const REF = { code: COURIER.UPS.CODE, name: COURIER.UPS.NAME }

const TOKEN_COOKIE = 'X-XSRF-TOKEN-ST'

interface Activity {
  date?: string
  time?: string
  location: string
  activityScan: string
}

interface TrackDetail {
  trackingNumber: string
  errorCode: string | null
  errorText?: string
  shipmentProgressActivities: Activity[]
}

interface Response {
  statusCode: string
  statusText?: string
  trackDetails: TrackDetail[]
}

function trackingInfo(number: string): TrackingInfo {
  return {
    cookie: {
      url: 'https://www.ups.com/track',
      method: 'GET'
    } satisfies TrackingRequest,
    detail: (token: string): TrackingRequest => ({
      method: 'POST',
      url: 'https://www.ups.com/track/api/Track/GetStatus?loc=en_US',
      body: JSON.stringify({
        Locale: 'en_US',
        Requester: 'UPSHome',
        TrackingNumber: [number]
      }),
      headers: {
        'content-type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0',
        'X-XSRF-TOKEN': token
      }
    })
  }
}

/** The API expects the CSRF cookie echoed back as a header. */
function parseToken(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []

  for (const cookie of cookies) {
    const [name, value] = (cookie.split(';')[0] ?? '').split('=')
    if (name === TOKEN_COOKIE) {
      return value ?? ''
    }
  }
  return ''
}

/**
 * UPS reports a 12-hour clock as "10:53 P.M.". Reading it as `HH:mm` silently shifts
 * every afternoon event back by twelve hours, so the meridiem has to be parsed — and the
 * periods stripped first, since dayjs's `A` token only matches "PM".
 *
 * Reported in #35 by @aldin-alagic.
 */
function parseTime(date: string, time: string | undefined): string {
  const meridiem = (time ?? '').replace(/\./g, '')
  return dayjs(`${date} ${meridiem}`, 'MM/DD/YYYY h:mm A').format('YYYY-MM-DDTHH:mmZ')
}

function parse(detail: TrackDetail): TraceResult {
  const checkpoints: Checkpoint[] = []

  for (const activity of detail.shipmentProgressActivities) {
    if (!activity.date) {
      continue
    }

    const message = activity.activityScan.trim()
    checkpoints.push({
      courier: REF,
      location: activity.location,
      message,
      status: message.includes('DELIVERED') ? STATUS.DELIVERED : STATUS.IN_TRANSIT,
      time: parseTime(activity.date, activity.time)
    })
  }

  return {
    courier: REF,
    number: detail.trackingNumber,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function ups(): Courier {
  return createCourier(COURIER.UPS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as {
        cookie: TrackingRequest
        detail: (token: string) => TrackingRequest
      }
      const session = createSession()

      const page = await session(tracking.cookie)
      const response = await session(tracking.detail(parseToken(page.headers['set-cookie'])))

      const body = parseJson<Response>(response)
      if (body.statusCode !== '200') {
        throw trackerError(body.statusText ?? 'unknown error.')
      }

      const detail = body.trackDetails[0]
      if (!detail || detail.errorCode !== null) {
        throw trackerError(detail?.errorText ?? 'unknown error.')
      }
      return parse(detail)
    }
  })
}
