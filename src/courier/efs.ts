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
import { request } from '../http.js'
import { inputValue, load } from '../scrape.js'

const REF = { code: COURIER.EFS.CODE, name: COURIER.EFS.NAME }

const DELIVERED = /Delivered|Network Completed/i
const INFO_RECEIVED = /Shipping Scheduled/i
const FAIL_ATTEMPT = /Consignee absent/i
const EXCEPTION =
  /Returned|Arrive Unmanifested|Short arrival|Bad Address|Customer refused|Declared lost|Failed delivery/i

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'http://web.efs.asia/script/users/tracking.php',
    data: {
      mode: 'search',
      search_no: number
    }
  }
}

function toStatus(statusMessage: string): Checkpoint['status'] {
  if (DELIVERED.test(statusMessage)) {
    return STATUS.DELIVERED
  }
  if (INFO_RECEIVED.test(statusMessage)) {
    return STATUS.INFO_RECEIVED
  }
  if (FAIL_ATTEMPT.test(statusMessage)) {
    return STATUS.FAIL_ATTEMPT
  }
  if (EXCEPTION.test(statusMessage)) {
    return STATUS.EXCEPTION
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string): TraceResult {
  const $ = load(html)
  const checkpoints: Checkpoint[] = []

  const rows = $('table').eq(6).find('tr').toArray()
  for (let i = 1; i < rows.length; i++) {
    const cols = $(rows[i]).find('td')
    if (cols.length === 1) {
      break
    }

    const statusMessage = cols.eq(4).text().trim()

    checkpoints.push({
      courier: REF,
      location: cols.eq(3).text().trim(),
      message: [statusMessage, cols.eq(5).text().trim(), cols.eq(6).text().trim()].join(' - '),
      status: toStatus(statusMessage),
      time: dayjs(
        [cols.eq(1).text().trim(), cols.eq(2).text().trim()].join(' '),
        'YYYY.MM.DD HH:mm'
      ).format('YYYY-MM-DDTHH:mm')
    })
  }

  checkpoints.reverse()

  return {
    courier: REF,
    number: inputValue($, '#search_no'),
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function efs(): Courier {
  return createCourier(COURIER.EFS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data })
      return parse(response.body)
    }
  })
}
