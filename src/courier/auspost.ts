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

const REF = { code: COURIER.AUSPOST.CODE, name: COURIER.AUSPOST.NAME }

const EXCEPTION_STATUSES = [
  'Cancelled',
  'Cannot be delivered',
  'Article damaged',
  'Unsuccessful pickup'
]

/** Australia Post's code for "this tracking id does not exist". */
const NOT_FOUND_CODE = 'ESB-BUS-DATA-105'

interface Event {
  Location: string
  EventDescription: string
  Status?: string
  EventDateTime: string
}

interface TrackingResult {
  TrackingID: string
  ReturnMessage: { Code?: string }
  Consignment?: { Articles: Array<{ Events: Event[] }> }
}

interface Response {
  QueryTrackEventsResponse?: { TrackingResults: TrackingResult[] }
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://digitalapi.auspost.com.au/track/v3/search?q=${number}`,
    headers: {
      Authorization: 'Basic cHJvZF90cmFja2FwaTpXZWxjb21lQDEyMw=='
    },
    json: true
  }
}

// https://developers.auspost.com.au/apis/shipping-and-tracking/reference/statuses
function toStatus(event: Event): Checkpoint['status'] {
  if (event.Status === 'Delivered') {
    return STATUS.DELIVERED
  }
  if (event.Status && EXCEPTION_STATUSES.includes(event.Status)) {
    return STATUS.EXCEPTION
  }
  if (event.Status === 'Started') {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(item: TrackingResult): TraceResult | null {
  if (item.ReturnMessage.Code === NOT_FOUND_CODE) {
    return null
  }

  const events = item.Consignment?.Articles[0]?.Events ?? []
  const checkpoints: Checkpoint[] = events.map((event) => ({
    courier: REF,
    location: event.Location,
    message: event.EventDescription,
    status: toStatus(event),
    time: event.EventDateTime
  }))

  return {
    courier: REF,
    number: item.TrackingID,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function auspost(): Courier {
  return createCourier(COURIER.AUSPOST, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))

      // The search API this courier was built on now answers 404 for every id, and the
      // API the tracking site itself calls is behind a bot challenge. Say that, rather
      // than let the error page fall through the parser as "invalid number".
      if (response.status !== 200) {
        throw trackerError(
          ERROR.SERVER_ERROR,
          `australia post answered ${response.status}: its tracking api was withdrawn and ` +
            'the one its own site uses refuses automated clients'
        )
      }

      const body = parseJson<Response>(response)

      if (!body.QueryTrackEventsResponse) {
        throw trackerError(ERROR.SEARCH_AGAIN)
      }

      const first = body.QueryTrackEventsResponse.TrackingResults[0]
      const result = first ? parse(first) : null
      if (!result) {
        throw trackerError(ERROR.INVALID_NUMBER)
      }
      return result
    }
  })
}
