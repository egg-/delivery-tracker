import {
  type Checkpoint,
  COURIER,
  type Courier,
  createCourier,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingInfo,
  type TrackingRequest
} from '../core.js'
import dayjs from '../dayjs.js'
import { createSession, parseJson } from '../http.js'

const REF = { code: COURIER.CANADAPOST.CODE, name: COURIER.CANADAPOST.NAME }

const BASE = 'https://www.canadapost-postescanada.ca'

// The JSON endpoint answers with "you need a business account" unless the request looks
// like the tracking page's own XHR: same session cookie, a browser agent, and a referer.
const AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

interface Address {
  countryNmEn?: string
  city?: string
}

interface Event {
  type?: string
  descEn: string
  /** Absent on events that are not tied to a facility, such as `Signature`. */
  locationAddr?: Address
  datetime: { date: string; time: string; zoneOffset: string }
}

interface Response {
  pin: string
  events: Event[]
  /** Set when the parcel went back to the shipper rather than reaching its addressee. */
  returnedToSender?: boolean
}

function trackingInfo(number: string): TrackingInfo {
  const details = `${BASE}/track-reperage/en/details/${number}`

  return {
    page: {
      method: 'GET',
      url: details,
      headers: { 'user-agent': AGENT }
    } satisfies TrackingRequest,
    detail: {
      method: 'GET',
      url: `${BASE}/track-reperage/rs/track/json/package/${number}/detail`,
      headers: {
        'user-agent': AGENT,
        accept: 'application/json, text/plain, */*',
        referer: details
      }
    } satisfies TrackingRequest
  }
}

function toStatus(type: string | undefined): Checkpoint['status'] {
  if (type === 'Delivered') {
    return STATUS.DELIVERED
  }
  if (type === 'Attempted') {
    return STATUS.FAIL_ATTEMPT
  }
  if (type === 'Induction') {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(body: Response): TraceResult {
  const checkpoints: Checkpoint[] = body.events.map((item) => ({
    courier: REF,
    location: item.locationAddr?.countryNmEn
      ? `${item.locationAddr.countryNmEn} ${item.locationAddr.city}`
      : '',
    message: item.descEn,
    status: toStatus(item.type),
    time: dayjs(
      `${item.datetime.date} ${item.datetime.time}T${item.datetime.zoneOffset}`,
      'YYYY-MM-DD HH:mm:ssZ'
    )
      .utc()
      .format('YYYY-MM-DDTHH:mmZ')
  }))

  // A returned parcel carries a `Delivered` event for the hand-back to the shipper, which
  // normalizeStatus would otherwise report as a successful delivery.
  const status = body.returnedToSender ? STATUS.RETURNED : normalizeStatus(checkpoints)

  return { courier: REF, number: body.pin, status, checkpoints }
}

export default function canadapost(): Courier {
  return createCourier(COURIER.CANADAPOST, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as Record<string, TrackingRequest>
      const session = createSession()

      const page = tracking.page
      if (page) {
        await session(page)
      }
      const response = await session(tracking.detail as TrackingRequest)

      return parse(parseJson<Response>(response))
    }
  })
}
