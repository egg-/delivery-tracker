import {
  type Checkpoint,
  COURIER,
  type Courier,
  createCourier,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingRequest
} from '../core.js'
import dayjs from '../dayjs.js'
import { parseJson, request } from '../http.js'

const REF = { code: COURIER.XPOST.CODE, name: COURIER.XPOST.NAME }

interface Event {
  remarks: string
  status?: string
  created_at: string
}

interface Response {
  tracking_number: string
  events?: Event[]
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://api.lbcx.ph/v1.1/orders/track/${number}`,
    json: true
  }
}

function parse(body: Response): TraceResult {
  const checkpoints: Checkpoint[] = (body.events ?? []).map((event) => {
    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (event.status === 'picked_up') {
      status = STATUS.INFO_RECEIVED
    } else if (event.status === 'delivered') {
      status = STATUS.DELIVERED
    }

    return {
      courier: REF,
      location: '',
      message: event.remarks,
      status,
      time: dayjs(event.created_at).format()
    }
  })

  checkpoints.reverse()

  return {
    courier: REF,
    number: body.tracking_number,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function xpost(): Courier {
  return createCourier(COURIER.XPOST, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      return parse(parseJson<Response>(response))
    }
  })
}
