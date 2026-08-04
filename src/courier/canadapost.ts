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

const REF = { code: COURIER.CANADAPOST.CODE, name: COURIER.CANADAPOST.NAME }

interface Event {
  type?: string
  descEn: string
  locationAddr: { countryNmEn?: string; city?: string }
  datetime: { date: string; time: string; zoneOffset: string }
}

interface Response {
  pin: string
  events: Event[]
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://www.canadapost-postescanada.ca/track-reperage/rs/track/json/package/${number}/detail`
  }
}

function parse(body: Response): TraceResult {
  const checkpoints: Checkpoint[] = body.events.map((item) => {
    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (item.type === 'Delivered') {
      status = STATUS.DELIVERED
    } else if (item.type === 'Induction') {
      status = STATUS.INFO_RECEIVED
    }

    return {
      courier: REF,
      location: item.locationAddr.countryNmEn
        ? `${item.locationAddr.countryNmEn} ${item.locationAddr.city}`
        : '',
      message: item.descEn,
      status,
      time: dayjs(
        `${item.datetime.date} ${item.datetime.time}T${item.datetime.zoneOffset}`,
        'YYYY-MM-DD HH:mm:ssZ'
      )
        .utc()
        .format('YYYY-MM-DDTHH:mmZ')
    }
  })

  return {
    courier: REF,
    number: body.pin,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function canadapost(): Courier {
  return createCourier(COURIER.CANADAPOST, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      return parse(parseJson<Response>(response))
    }
  })
}
