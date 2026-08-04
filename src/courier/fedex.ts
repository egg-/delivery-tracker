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
import { parseJson, request } from '../http.js'

const REF = { code: COURIER.FEDEX.CODE, name: COURIER.FEDEX.NAME }

interface ScanEvent {
  status: string
  scanDetails?: string
  scanLocation: string
  statusCD?: string
  isException?: boolean
  isDelivered?: boolean
  date: string
  time: string
  gmtOffset: string
}

interface Package {
  displayTrackingNbr: string
  estDeliveryDt?: string
  isSuccessful?: boolean
  scanEventList: ScanEvent[]
}

interface Response {
  TrackPackagesResponse: { packageList: Package[] }
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'https://www.fedex.com/trackingCal/track',
    data: {
      data: JSON.stringify({
        TrackPackagesRequest: {
          trackingInfoList: [{ trackNumberInfo: { trackingNumber: number } }]
        }
      }),
      action: 'trackpackages'
    }
  }
}

// https://www.fedex.com/us/developer/WebHelp/ws/2014/dvg/WS_DVG_WebHelp/Appendix_Q_Track_Service_Scan_Codes.htm
function toStatus(event: ScanEvent): Checkpoint['status'] {
  if (event.isDelivered) {
    return STATUS.DELIVERED
  }
  if (event.isException) {
    return STATUS.EXCEPTION
  }
  if (event.statusCD === 'OC') {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(item: Package): TraceResult {
  const checkpoints: Checkpoint[] = item.isSuccessful
    ? item.scanEventList.map((event) => ({
        courier: REF,
        location: event.scanLocation,
        message: [event.status, event.scanDetails].filter(Boolean).join(' - '),
        status: toStatus(event),
        time: `${event.date}T${event.time}${event.gmtOffset}`
      }))
    : []

  return {
    courier: REF,
    number: item.displayTrackingNbr,
    status: normalizeStatus(checkpoints),
    checkpoints,
    eta: item.estDeliveryDt
  }
}

export default function fedex(): Courier {
  return createCourier(COURIER.FEDEX, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data, json: true })

      const item = parseJson<Response>(response).TrackPackagesResponse.packageList[0]
      if (!item) {
        throw trackerError(ERROR.INVALID_NUMBER)
      }
      return parse(item)
    }
  })
}
