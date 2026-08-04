import {
  type Checkpoint,
  COURIER,
  type Courier,
  type CourierOptions,
  createCourier,
  ERROR,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingRequest,
  trackerError
} from '../core.js'
import dayjs from '../dayjs.js'
import { parseJson, request } from '../http.js'

const REF = { code: COURIER.SICEPAT.CODE, name: COURIER.SICEPAT.NAME }

interface History {
  status: string
  receiver_name?: string
  city?: string
  date_time: string
}

interface Response {
  sicepat?: {
    status: { code: number; description: string }
    result: { track_history?: History[] }
  }
  message?: string
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `http://api.sicepat.com/customer/waybill?waybill=${number}`,
    json: true
  }
}

function parse(body: Required<Response>['sicepat'], number: string): TraceResult {
  const history = body.result.track_history ?? []
  const checkpoints: Checkpoint[] = []

  // The API lists the newest event first; results are oldest first.
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i]
    if (!item) {
      continue
    }

    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (item.status === 'PICKREQ') {
      status = STATUS.INFO_RECEIVED
    } else if (item.status === 'DELIVERED') {
      status = STATUS.DELIVERED
    }

    checkpoints.push({
      courier: REF,
      location: '',
      message: `[${item.status}] ${item.receiver_name || item.city || ''}`,
      status,
      time: dayjs(`${item.date_time}+0700`).utc().format('YYYY-MM-DDTHH:mmZ')
    })
  }

  return {
    courier: REF,
    number,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function sicepat(opts?: CourierOptions): Courier {
  const apikey = opts?.apikey
  if (!apikey) {
    throw new Error('API Key is required')
  }

  return createCourier(COURIER.SICEPAT, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request({
        ...trackingInfo(number),
        headers: { 'api-key': apikey }
      })
      const body = parseJson<Response>(response)

      if (!body.sicepat) {
        throw trackerError(body.message ?? ERROR.UNKNOWN)
      }
      if (body.sicepat.status.code !== 200) {
        throw trackerError(body.sicepat.status.description)
      }
      return parse(body.sicepat, number)
    }
  })
}
