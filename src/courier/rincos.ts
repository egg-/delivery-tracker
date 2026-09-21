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
import { request } from '../http.js'
import { load } from '../scrape.js'

const REF = { code: COURIER.RINCOS.CODE, name: COURIER.RINCOS.NAME }

const INFO_RECEIVED = /Picked Up|Order received/i
const DELIVERED =
  /SUCCEED RECEIVED BY|Delivered|RELEASED TO REPRESENTATIVE|FINAL DELIVERY|DELIVERD/i
const NOT_FOUND = /No tracking information found/i

/** The result page prints one date column; these are the forms seen on it. */
const TIME_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY.MM.DD HH:mm:ss',
  'YYYY.MM.DD HH:mm'
]

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'http://www.rincos.co.kr/tracking/TrackingInfo?lang=en',
    data: {
      schTrackings: number
    }
  }
}

function toStatus(message: string): Checkpoint['status'] {
  if (DELIVERED.test(message)) {
    return STATUS.DELIVERED
  }
  if (INFO_RECEIVED.test(message)) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string, number: string): TraceResult {
  const $ = load(html)

  if (NOT_FOUND.test($('table').text())) {
    throw trackerError(ERROR.INVALID_NUMBER)
  }

  // Both the ORIGIN and DESTINATION tables lead with Date, Status and Location; ORIGIN
  // carries a fourth Remark column.
  const checkpoints: Checkpoint[] = []
  for (const row of $('.black_tbl .list-tbl table tbody tr').toArray()) {
    const cols = $(row).find('td')
    if (cols.length < 3) {
      continue
    }

    const message = [cols.eq(1).text().trim(), cols.eq(3).text().trim()].filter(Boolean).join(' - ')

    checkpoints.push({
      courier: REF,
      location: cols.eq(2).text().trim(),
      message,
      status: toStatus(message),
      time: dayjs(cols.eq(0).text().trim(), TIME_FORMATS).format('YYYY-MM-DDTHH:mm')
    })
  }

  checkpoints.reverse()

  return {
    courier: REF,
    number: $('td.lef').first().text().trim() || number,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function rincos(): Courier {
  return createCourier(COURIER.RINCOS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data })
      return parse(response.body, number)
    }
  })
}
