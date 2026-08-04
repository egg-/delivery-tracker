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
import { parseJson, request } from '../http.js'
import { load } from '../scrape.js'

const REF = { code: COURIER.LBC.CODE, name: COURIER.LBC.NAME }

interface HashResponse {
  hash: string
}

function trackingInfo(number: string): TrackingInfo {
  return {
    hash: {
      url: 'https://www.lbcexpress.com/AMisc/searchRedirect',
      method: 'POST',
      formData: { keyword: number }
    } satisfies TrackingRequest,
    checkpoints: (hash: string): TrackingRequest => ({
      url: `https://www.lbcexpress.com/track/${hash}`,
      method: 'GET'
    })
  }
}

function parse(html: string, number: string): TraceResult {
  const $ = load(html)

  const checkpoints: Checkpoint[] = $('.mobile-tracking-list')
    .toArray()
    .map((el) => {
      const $el = $(el)
      const message = $el.find('.mobile-tracking-details').eq(0).text().trim()
      // e.g. "Tue, 02 June 2020"
      const datetime = $el.find('.mobile-tracking-timedate').text().trim()

      let status: Checkpoint['status'] = STATUS.IN_TRANSIT
      if (message.includes('Received by')) {
        status = STATUS.DELIVERED
      } else if (message.includes('Accepted at')) {
        status = STATUS.INFO_RECEIVED
      }

      return {
        courier: REF,
        location: '',
        message,
        status,
        time: dayjs(`${datetime}+0800`, 'ddd DD MMMM YYYYZ').utc().format('YYYY-MM-DDTHH:mmZ')
      }
    })

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function lbc(): Courier {
  return createCourier(COURIER.LBC, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const tracking = trackingInfo(number) as {
        hash: TrackingRequest
        checkpoints: (hash: string) => TrackingRequest
      }

      // The tracking page lives behind an opaque hash the search endpoint hands out.
      const lookup = await request(tracking.hash)
      const { hash } = parseJson<HashResponse>(lookup)

      const response = await request(tracking.checkpoints(hash))
      return parse(response.body, number)
    }
  })
}
