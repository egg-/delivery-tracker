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

const BASE = 'https://www.epantos.com/eCommerce/action'

interface Summary {
  hblNo: string
  mblNo?: string
  refBlNo?: string
  expsBizTypeCd?: string
  podNatnCd?: string
  carrTypeCd?: string
  wmDomCarr?: string
}

interface Event {
  evntCd: string
  evntLocNm: string
  evntDesc: string
  eventDt: string
}

interface Envelope<T> {
  body?: T
}

interface SummaryBody {
  list?: Summary[]
  result?: { RESULT_CD?: string; RESULT_MSG?: string }
}

function trackingInfo(number: string): TrackingInfo {
  return {
    index: {
      url: 'https://www.epantos.com/ecp/web/pr/dt/popup/dlvChaseInqPopup.do',
      method: 'GET'
    } satisfies TrackingRequest,
    summary: {
      url: `${BASE}/portal.TrackingPopup.retreiveTrackingList`,
      method: 'POST',
      json: true,
      body: { quickNo: number, locale: 'en' }
    } satisfies TrackingRequest,
    checkpoints: (hblNo?: string, mblNo?: string, expsBizTypeCd?: string, wmDomCarr?: string) =>
      ({
        url: `${BASE}/portal.TrackingPopup.retreiveTrackingListDtl`,
        method: 'POST',
        json: true,
        body: {
          hblNo: hblNo ?? number,
          mblNo: mblNo ?? '',
          locale: 'en',
          expsBizTypeCd: expsBizTypeCd ?? '',
          carrSprCd: null,
          wmDomCarr: wmDomCarr ?? null
        }
      }) satisfies TrackingRequest
  }
}

function parseCheckpoints(events: Event[]): Checkpoint[] {
  return events.map((item) => {
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
function parseHandover(summary: Summary): { code: string; number: string } | null {
  const number = summary.refBlNo

  if (!number || summary.expsBizTypeCd !== 'PX') {
    return null
  }

  if (summary.podNatnCd === 'AU') {
    return { code: COURIER.AUSPOST.CODE, number }
  }
  return null
}

export default function pantos(): Courier {
  return createCourier(COURIER.PANTOS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as {
        index: TrackingRequest
        summary: TrackingRequest
        checkpoints: (...args: (string | undefined)[]) => TrackingRequest
      }
      const session = createSession()

      // The endpoints only answer to a session that has opened the popup page first.
      await session(tracking.index)

      const summaryBody = parseJson<Envelope<SummaryBody>>(await session(tracking.summary)).body
      const resultCode = summaryBody?.result?.RESULT_CD
      if (resultCode !== undefined && resultCode !== '0') {
        throw trackerError(ERROR.SEARCH_AGAIN)
      }

      // An unknown number comes back as an empty list rather than an error.
      const summary = summaryBody?.list?.[0]
      if (!summary) {
        throw trackerError(ERROR.INVALID_NUMBER)
      }

      const detail = await session(
        tracking.checkpoints(summary.hblNo, summary.mblNo, summary.expsBizTypeCd, summary.wmDomCarr)
      )
      let checkpoints = parseCheckpoints(parseJson<Envelope<Event[]>>(detail).body ?? [])

      const handover = parseHandover(summary)
      const factory = handover ? HANDOVER[handover.code] : undefined
      if (handover && factory) {
        try {
          const handoverResult = await factory().trace(handover.number)
          checkpoints = checkpoints
            .concat(handoverResult.checkpoints)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        } catch {
          // The receiving carrier is a bonus: a failure there must not lose the
          // checkpoints Pantos itself reported.
        }
      }

      return {
        courier: REF,
        number: summary.hblNo || number,
        status: normalizeStatus(checkpoints),
        checkpoints
      }
    }
  })
}
