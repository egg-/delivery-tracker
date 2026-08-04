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

const REF = { code: COURIER.DHL.CODE, name: COURIER.DHL.NAME }

interface Event {
  description: string
  statusCode?: string
  timestamp: string
  location?: { address?: { addressLocality?: string } }
}

interface Shipment {
  id: string
  events: Event[]
}

interface Response {
  shipments: Shipment[]
}

export default function dhl(opts?: CourierOptions): Courier {
  const apikey = opts?.apikey

  function trackingInfo(number: string): TrackingRequest {
    return {
      method: 'GET',
      url: `https://api-eu.dhl.com/track/shipments?trackingNumber=${number}`,
      json: true,
      headers: { 'DHL-API-Key': apikey ?? '' }
    }
  }

  function parse(shipment: Shipment): TraceResult {
    const checkpoints: Checkpoint[] = shipment.events.map((item) => {
      let status: Checkpoint['status'] = STATUS.IN_TRANSIT
      if (item.statusCode === 'delivered') {
        status = STATUS.DELIVERED
      } else if (item.statusCode === 'returned') {
        status = STATUS.RETURNED
      }

      return {
        courier: REF,
        location: item.location?.address?.addressLocality ?? '',
        message: item.description,
        status,
        time: dayjs(item.timestamp).utc().format('YYYY-MM-DDTHH:mmZ')
      }
    })

    return {
      courier: REF,
      number: shipment.id,
      status: normalizeStatus(checkpoints),
      checkpoints
    }
  }

  return createCourier(COURIER.DHL, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      if (!apikey) {
        throw trackerError(ERROR.REQUIRED_APIKEY)
      }

      const response = await request(trackingInfo(number))
      if (response.status !== 200) {
        throw trackerError(response.statusText)
      }

      const shipment = parseJson<Response>(response).shipments[0]
      if (!shipment) {
        throw trackerError(ERROR.INVALID_NUMBER)
      }
      return parse(shipment)
    }
  })
}
