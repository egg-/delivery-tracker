import {
  type Checkpoint,
  COURIER,
  type Courier,
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

const REF = { code: COURIER.POSLAJU.CODE, name: COURIER.POSLAJU.NAME }

const DELIVERED = /Delivery completed|Delivered/i
const RETURNED = /Return/i
const FAIL_ATTEMPT = /Unsuccessful|Failed delivery|Attempted/i
const INFO_RECEIVED = /Collected|Item posted/i

interface Event {
  date: string
  process: string
  process_summary: string
  office: string
}

interface Shipment {
  connote_id: string
  process_status?: string
  tracking_data: Event[] | null
}

interface Response {
  code: string
  message?: string
  data?: Shipment[]
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'https://ttu-svc.pos.com.my/api/trackandtrace/v1/request',
    json: true,
    body: { connote_ids: [number], culture: 'en' }
  }
}

function toStatus(summary: string): Checkpoint['status'] {
  if (DELIVERED.test(summary)) {
    return STATUS.DELIVERED
  }
  if (RETURNED.test(summary)) {
    return STATUS.RETURNED
  }
  if (FAIL_ATTEMPT.test(summary)) {
    return STATUS.FAIL_ATTEMPT
  }
  if (INFO_RECEIVED.test(summary)) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(body: Response, number: string): TraceResult {
  const shipment = body.data?.[0]

  // An unknown or expired number answers with the shipment envelope and no events.
  if (!shipment?.tracking_data?.length) {
    throw trackerError(ERROR.INVALID_NUMBER)
  }

  const checkpoints: Checkpoint[] = shipment.tracking_data.map((event) => ({
    courier: REF,
    location: event.office.trim(),
    message: event.process.trim(),
    status: toStatus(`${event.process_summary} ${event.process}`),
    time: dayjs(event.date.trim(), 'DD MMM YYYY, hh:mm:ss A').format('YYYY-MM-DDTHH:mm:ss')
  }))

  return {
    courier: REF,
    number: shipment.connote_id || number,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function poslaju(): Courier {
  return createCourier(COURIER.POSLAJU, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      const body = parseJson<Response>(response)

      if (body.code !== 'S0000') {
        throw trackerError(ERROR.SERVER_ERROR, body.message ?? body.code)
      }
      return parse(body, number)
    }
  })
}
