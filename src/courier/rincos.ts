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

const INFO_RECEIVED = /Picked Up/i
const DELIVERED =
  /SUCCEED RECEIVED BY|Delivered|RELEASED TO REPRESENTATIVE|FINAL DELIVERY|DELIVERD/i

/** The checkpoint table starts after three header rows. */
const HEADER_ROWS = 3

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'http://www.rincos.co.kr/tracking/tracking_web.asp',
    data: {
      invoice: number
    }
  }
}

function parse(html: string): TraceResult {
  const $ = load(html)

  const infoTable = $('div.border > table > tr').eq(1).find('> td > table')
  const summary = infoTable.eq(0).find('tr').eq(1).find('> td')
  const number = summary.eq(2).text().trim()

  if (!number) {
    throw trackerError(ERROR.INVALID_NUMBER)
  }

  const checkpoints: Checkpoint[] = []
  const rows = infoTable.eq(1).find('> tr').toArray()

  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const cols = $(rows[i]).find('> td')
    if (cols.length === 1) {
      continue
    }

    const message = cols.eq(6).text().trim()

    let status: Checkpoint['status'] = STATUS.IN_TRANSIT
    if (INFO_RECEIVED.test(message)) {
      status = STATUS.INFO_RECEIVED
    } else if (DELIVERED.test(message)) {
      status = STATUS.DELIVERED
    }

    checkpoints.push({
      courier: REF,
      location: cols.eq(4).text().trim(),
      message,
      status,
      time: dayjs(
        [cols.eq(0).text().trim(), cols.eq(2).text().trim()].join(' '),
        'YYYY.MM.DD HH:mm'
      ).format('YYYY-MM-DDTHH:mm')
    })
  }

  checkpoints.reverse()

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function rincos(): Courier {
  return createCourier(COURIER.RINCOS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data })
      return parse(response.body)
    }
  })
}
