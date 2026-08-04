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
import { load } from '../scrape.js'

const REF = { code: COURIER.EPARCEL.CODE, name: COURIER.EPARCEL.NAME }

const DELIVERED = /delivered|delivery completed|completion of the delivery/i
const INFO_RECEIVED = /ready for/i
const NUMBER_PATTERN = /Delivery No : (\w+)/

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://eparcel.kr/Track/Result?mode=0&lang=en-US&ids=${number}`
  }
}

function parse(html: string, number: string): TraceResult {
  const $ = load(html)
  const body = $('.result-body-1')
  const summary = body.find('.panel-body')
  const table = body.find('.table-striped tbody').eq(0)

  const checkpoints: Checkpoint[] = table
    .find('tr')
    .toArray()
    .map((row) => {
      const cols = $(row).find('td')
      const statusMessage = cols.eq(1).text().trim()
      const location = cols.eq(2).text().trim()

      let status: Checkpoint['status'] = STATUS.IN_TRANSIT
      if (DELIVERED.test(statusMessage)) {
        status = STATUS.DELIVERED
      } else if (INFO_RECEIVED.test(statusMessage)) {
        status = STATUS.INFO_RECEIVED
      }

      return {
        courier: REF,
        location,
        message: [statusMessage, location].join(' - '),
        status,
        time: dayjs(cols.eq(0).text().trim(), 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DDTHH:mm')
      }
    })

  return {
    courier: REF,
    number: summary.text().match(NUMBER_PATTERN)?.[1] ?? number,
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function eparcel(): Courier {
  return createCourier(COURIER.EPARCEL, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      return parse(response.body, number)
    }
  })
}
