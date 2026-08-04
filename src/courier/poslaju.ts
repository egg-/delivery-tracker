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

const REF = { code: COURIER.POSLAJU.CODE, name: COURIER.POSLAJU.NAME }

// The page echoes the number in a textarea and ships the checkpoint table as a JS string.
const NUMBER_PATTERN = /id="trackingNo03".*>(.*)<\/textarea>/
const TABLE_PATTERN = /var strTD =\s+"(.*)";/

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'http://www.poslaju.com.my/track-trace-v2/',
    data: {
      trackingNo03: number
    }
  }
}

function toStatus(message: string): Checkpoint['status'] {
  if (message.includes('successfully delivered') || message.includes('delivered to')) {
    return STATUS.DELIVERED
  }
  if (message.includes('Unsuccessful delivery')) {
    return STATUS.EXCEPTION
  }
  if (message.includes('Item posted over the counter')) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string): TraceResult {
  const number = html.match(NUMBER_PATTERN)?.[1]
  const table = html.match(TABLE_PATTERN)?.[1]

  if (number === undefined || table === undefined) {
    throw trackerError(ERROR.INVALID_NUMBER)
  }

  const $ = load(table)
  const checkpoints: Checkpoint[] = $('tbody > tr')
    .toArray()
    .map((row) => {
      const cols = $(row).find('> td')
      const message = cols.eq(1).text().trim()

      return {
        courier: REF,
        location: cols.eq(2).text().trim(),
        message,
        status: toStatus(message),
        time: dayjs(cols.eq(0).text().trim(), 'DD MMM YYYY, HH:mm:ss').format('YYYY-MM-DDTHH:mm:ss')
      }
    })

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function poslaju(): Courier {
  return createCourier(COURIER.POSLAJU, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data })
      return parse(response.body)
    }
  })
}
