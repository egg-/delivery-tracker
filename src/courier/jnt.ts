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

const REF = { code: COURIER.JNT.CODE, name: COURIER.JNT.NAME }

interface Detail {
  scanstatus: string
  scanscode?: string
  city?: string
  siteName?: string
  acceptTime: string
}

interface Track {
  details: Detail[]
}

interface Envelope {
  code: number
  desc?: string
  /** The payload arrives as a JSON string inside the JSON envelope. */
  data: string
}

function trackingInfo(number: string): TrackingInfo {
  const cookie: TrackingRequest = {
    url: 'https://www.jtexpress.ph/index/query/gzquery.html',
    method: 'GET'
  }
  const track: TrackingRequest = {
    method: 'POST',
    url: 'https://www.jtexpress.ph/index/router/index.html',
    json: true,
    headers: {
      'X-SimplyPost-Id': 'testtesttest',
      'X-SimplyPost-Signature': '712d5af47cd24adf54fe39ebc4ed0aea'
    },
    body: {
      method: 'order.orderTrack',
      data: { billCode: number, lang: 'en', source: 3 },
      version: '2.2.22',
      pId: 'testtesttest',
      pst: '712d5af47cd24adf54fe39ebc4ed0aea'
    }
  }
  return { cookie, track }
}

function parse(track: Track, number: string): TraceResult {
  const checkpoints: Checkpoint[] = track.details.map((item) => {
    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (item.scanscode === '5') {
      status = STATUS.DELIVERED
    } else if (item.scanstatus === 'Returned') {
      status = STATUS.RETURNED
    }

    return {
      courier: REF,
      location: item.city || item.siteName || '',
      message: item.scanstatus,
      status,
      time: dayjs(`${item.acceptTime}T+0800`, 'YYYY-MM-DD HH:mm:ss.0Z')
        .utc()
        .format('YYYY-MM-DDTHH:mmZ')
    }
  })

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function jnt(): Courier {
  return createCourier(COURIER.JNT, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as { cookie: TrackingRequest; track: TrackingRequest }
      const session = createSession()

      // The API only answers once the session cookie from the query page is present.
      await session(tracking.cookie)
      const response = await session(tracking.track)

      if (response.status !== 200) {
        throw trackerError(response.statusText)
      }

      const envelope = parseJson<Envelope>(response)
      if (envelope.code !== 200) {
        throw trackerError(envelope.code, envelope.desc)
      }
      return parse(JSON.parse(envelope.data) as Track, number)
    }
  })
}
