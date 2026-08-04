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
import { createSession } from '../http.js'
import { load } from '../scrape.js'

const REF = { code: COURIER.PAXEL.CODE, name: COURIER.PAXEL.NAME }

const DELIVERED = /berhasil diantar/i
const INFO_RECEIVED = /Ordermu terkonfirmasi|Order sudah diterima/i
const TOKEN_PATTERN = /name="_token"\s+value="([\d\w-]+)"/i

function trackingInfo(number: string): TrackingInfo {
  return {
    token: {
      url: 'https://paxel.co/',
      method: 'GET'
    } satisfies TrackingRequest,
    detail: (token: string): TrackingRequest => ({
      method: 'POST',
      url: 'https://paxel.co/id/lacak-pengiriman',
      formData: {
        _token: token,
        shipment_code: number
      }
    })
  }
}

function parseToken(html: string): string {
  return html.match(TOKEN_PATTERN)?.[1] ?? ''
}

function parse(html: string): TraceResult {
  const $ = load(html)
  const checkpoints: Checkpoint[] = []

  // The timeline alternates: one node holds location + time, the next holds the message.
  const timeline = $('.delivery-timeline > div')
  for (let i = 0; i < timeline.length; i += 2) {
    const location = timeline.eq(i).children().eq(0).text().trim()
    const rawTime = timeline.eq(i).children().eq(1).text().trim()
    const message = timeline
      .eq(i + 1)
      .text()
      .trim()

    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (DELIVERED.test(message)) {
      status = STATUS.DELIVERED
    } else if (INFO_RECEIVED.test(message)) {
      status = STATUS.INFO_RECEIVED
    }

    // e.g. "Feb 04 | 17:02" — no year, so a date ahead of now belongs to last year.
    let time = dayjs(rawTime, 'MMM DD | kk:mm+0700')
    if (time.unix() > dayjs().unix()) {
      time = time.subtract(1, 'year')
    }

    checkpoints.push({
      courier: REF,
      location,
      message,
      status,
      time: time.format('YYYY-MM-DDTHH:mm:00+0700')
    })
  }

  return {
    courier: REF,
    number: $('.detail-container h5').text().trim(),
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function paxel(): Courier {
  return createCourier(COURIER.PAXEL, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as {
        token: TrackingRequest
        detail: (token: string) => TrackingRequest
      }
      const session = createSession()

      const page = await session(tracking.token)
      const response = await session(tracking.detail(parseToken(page.body)))

      return parse(response.body)
    }
  })
}
