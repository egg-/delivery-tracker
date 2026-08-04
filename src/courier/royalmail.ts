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

const REF = { code: COURIER.ROYALMAIL.CODE, name: COURIER.ROYALMAIL.NAME }

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://www.royalmail.com/track-your-item?trackNumber=${number}`
  }
}

function toStatus(message: string): Checkpoint['status'] {
  if (message.includes('Delivered')) {
    return STATUS.DELIVERED
  }
  if (message.includes('NOT DELIVERED')) {
    return STATUS.FAIL_ATTEMPT
  }
  if (message.includes('Recipient Collected')) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string): TraceResult {
  const $ = load(html)
  const number = inputValue($, '#edit-tracking-number')

  const checkpoints: Checkpoint[] = []
  const rows = $(`#rml-track-trace-tracking-details-dialog-${number}`)
    .find('table')
    .eq(0)
    .find('tbody')
    .find('tr')
    .toArray()

  for (const row of rows) {
    const cols = $(row).find('td')
    if (cols.length === 1) {
      break
    }

    const message = cols.eq(2).text().trim()
    // The two cells read e.g. "18/01/17" and "23:53".
    const time = dayjs(cols.eq(0).text().trim() + cols.eq(1).text().trim(), 'DD/MM/YYHH:mm')

    checkpoints.push({
      courier: REF,
      location: cols.eq(3).text().trim(),
      message,
      status: toStatus(message),
      time: time.isValid() ? time.format('YYYY-MM-DDTHH:mm:ss') : ''
    })
  }

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function royalmail(): Courier {
  return createCourier(COURIER.ROYALMAIL, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      return parse(response.body)
    }
  })
}
