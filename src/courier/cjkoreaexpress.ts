import {
  type Checkpoint,
  COURIER,
  type Courier,
  createCourier,
  normalizeStatus,
  STATUS,
  type TraceResult,
  type TrackingInfo,
  type TrackingRequest
} from '../core.js'
import dayjs from '../dayjs.js'
import { createSession, parseJson } from '../http.js'

const REF = { code: COURIER.CJKOREAEXPRESS.CODE, name: COURIER.CJKOREAEXPRESS.NAME }

const INFO_RECEIVED_SCANS = ['집화처리', '상품인수']

interface Item {
  regBranNm: string
  crgNm: string
  scanNm?: string
  dTime: string
}

interface Response {
  parcelDetailResultMap: {
    paramInvcNo: string
    resultList: Item[]
  }
}

function trackingInfo(number: string): TrackingInfo {
  const invoiceNumber = String(number).replace(/-/gm, '')
  return {
    cookie: {
      url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
      method: 'GET'
    } satisfies TrackingRequest,
    detail: (csrf: string): TrackingRequest => ({
      method: 'POST',
      url: 'https://www.cjlogistics.com/ko/tool/parcel/tracking-detail',
      json: true,
      form: {
        _csrf: csrf,
        paramInvcNo: invoiceNumber
      }
    })
  }
}

/** The detail endpoint rejects requests without the CSRF token embedded in the tracking page. */
function parseCsrf(html: string): string {
  return html.match(/name="_csrf"\s+value="([\d\w-]+)"/i)?.[1] ?? ''
}

function parse(body: Response): TraceResult {
  const { paramInvcNo, resultList } = body.parcelDetailResultMap

  const checkpoints: Checkpoint[] = resultList.map((item) => {
    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (item.scanNm && INFO_RECEIVED_SCANS.includes(item.scanNm)) {
      status = STATUS.INFO_RECEIVED
    } else if (item.scanNm === '배달완료') {
      status = STATUS.DELIVERED
    }

    return {
      courier: REF,
      location: item.regBranNm,
      message: item.crgNm,
      status,
      time: dayjs(`${item.dTime}+0900`).utc().format('YYYY-MM-DDTHH:mmZ')
    }
  })

  checkpoints.reverse()

  return {
    courier: REF,
    number: paramInvcNo,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function cjkoreaexpress(): Courier {
  return createCourier(COURIER.CJKOREAEXPRESS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as {
        cookie: TrackingRequest
        detail: (csrf: string) => TrackingRequest
      }
      const session = createSession()

      const page = await session(tracking.cookie)
      const response = await session(tracking.detail(parseCsrf(page.body)))

      return parse(parseJson<Response>(response))
    }
  })
}
