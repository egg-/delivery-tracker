import {
  type Checkpoint,
  COURIER,
  type Courier,
  type CourierFactory,
  createCourier,
  ERROR,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingInfo,
  type TrackingRequest,
  trackerError
} from '../core.js'
import dayjs from '../dayjs.js'
import { createSession, parseJson } from '../http.js'
import auspost from './auspost.js'

const REF = { code: COURIER.PANTOS.CODE, name: COURIER.PANTOS.NAME }

/**
 * Pantos hands parcels over to a local carrier for the last leg. It also names UPS, USPS
 * and FedEx, but those couriers were dropped because they block automated access, so a
 * handover to them is reported as Pantos's own checkpoints and nothing more.
 */
const HANDOVER: Record<string, CourierFactory> = {
  [COURIER.AUSPOST.CODE]: auspost
}

interface Summary {
  hblNo: string
  refBlNo?: string
  expsBizTypeCd?: string
  podNatnCd?: string
  carrTypeCd?: string
  linkedAddr?: string
}

interface Event {
  evntCd: string
  evntLocNm: string
  evntDesc: string
  eventDt: string
}

interface SummaryResponse {
  OUT_DS1: Summary[]
  result?: { RESULT_CD?: string }
}

interface CheckpointResponse {
  OUT_DS1: Event[]
}

function payload(params: Record<string, unknown>): Record<string, string> {
  return { _dataset_: JSON.stringify({ IN_PARAM: params }) }
}

function trackingInfo(number: string): TrackingInfo {
  return {
    index: {
      url: 'http://www.epantos.com/ecp/web/pr/dt/popup/dlvChaseInqPopup.do',
      method: 'GET'
    } satisfies TrackingRequest,
    summary: {
      url: 'http://www.epantos.com/ecp/pr/dt/dlvchaseinq/retreiveTrackingList.dev',
      method: 'POST',
      json: true,
      formData: payload({ quickNo: [number], locale: 'en' })
    } satisfies TrackingRequest,
    checkpoints: {
      url: 'http://www.epantos.com/ecp/pr/dt/dlvchaseinq/retreiveTrackingListDtl.dev',
      method: 'POST',
      json: true,
      formData: payload({
        hblNo: number,
        mblNo: '',
        locale: 'en',
        expsBizTypeCd: '',
        carrSprCd: null,
        wmDomCarr: null
      })
    } satisfies TrackingRequest
  }
}

function parseCheckpoints(body: CheckpointResponse): Checkpoint[] {
  return body.OUT_DS1.map((item) => {
    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (item.evntCd === 'DLI') {
      status = STATUS.DELIVERED
    } else if (item.evntCd === 'PKU') {
      status = STATUS.INFO_RECEIVED
    }

    return {
      courier: REF,
      location: item.evntLocNm,
      message: item.evntDesc,
      status,
      time: dayjs(item.eventDt, 'YYYYMMDDHHmm').format('YYYY-MM-DDTHH:mm')
    }
  })
}

/**
 * Works out which local carrier finished the delivery, if the summary names one that is
 * still supported. US handovers go to UPS, USPS or FedEx, none of which can be traced any
 * more, so they are left alone.
 */
function parseHandover(body: SummaryResponse): { code: string; number: string } | null {
  const data = body.OUT_DS1[0]
  const number = data?.refBlNo

  if (!data || !number || data.expsBizTypeCd !== 'PX') {
    return null
  }

  if (data.podNatnCd === 'AU') {
    return { code: COURIER.AUSPOST.CODE, number }
  }
  return null
}

export default function pantos(): Courier {
  return createCourier(COURIER.PANTOS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as Record<string, TrackingRequest>
      const session = createSession()

      // The endpoints only answer to a session that has opened the popup page first.
      const index = tracking.index
      if (index) {
        await session(index)
      }

      const [summaryResponse, checkpointResponse] = await Promise.all([
        session(tracking.summary as TrackingRequest),
        session(tracking.checkpoints as TrackingRequest)
      ])

      const summary = parseJson<SummaryResponse>(summaryResponse)
      if (summary.result?.RESULT_CD === '-1') {
        throw trackerError(ERROR.SEARCH_AGAIN)
      }

      let checkpoints = parseCheckpoints(parseJson<CheckpointResponse>(checkpointResponse))

      const handover = parseHandover(summary)
      if (handover) {
        const factory = HANDOVER[handover.code]
        if (factory) {
          const handoverResult = await factory().trace(handover.number)
          checkpoints = checkpoints
            .concat(handoverResult.checkpoints)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        }
      }

      return {
        courier: REF,
        number: summary.OUT_DS1[0]?.hblNo ?? number,
        status: normalizeStatus(checkpoints),
        checkpoints
      }
    }
  })
}
