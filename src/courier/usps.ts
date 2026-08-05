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

const REF = { code: COURIER.USPS.CODE, name: COURIER.USPS.NAME }

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${number}`
  }
}

// The date cell has appeared in several shapes over the years: "March 16, 2024,1:55 pm"
// (no space after the second comma), "March 7, 2024,9:15 pm" (unpadded day),
// "March 13, 2024" (no time) and, per #35, runs of whitespace in the middle of the
// string. Whitespace is collapsed first, then these formats cover the rest.
const DATE_FORMATS = ['MMMM D, YYYY, h:mm a', 'MMMM D, YYYY,h:mm a', 'MMMM D, YYYY']

function toStatus(message: string): Checkpoint['status'] {
  if (message.includes('Delivered')) {
    return STATUS.DELIVERED
  }
  if (message.includes('Shipping Label Created')) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string): TraceResult {
  const $ = load(html)

  const checkpoints: Checkpoint[] = $('.tracking-progress-bar-status-container')
    .find('.tb-step')
    .toArray()
    // The collapsed "see all history" block repeats steps already listed above it.
    .filter((el) => !$(el).hasClass('toggle-history-container'))
    .map((el) => {
      const $el = $(el)
      const message = $el.find('.tb-status-detail').text()

      return {
        courier: REF,
        location: $el.find('.tb-location').text().trim(),
        message,
        status: toStatus(message),
        time: dayjs($el.find('.tb-date').text().replace(/\s+/g, ' ').trim(), DATE_FORMATS).format(
          'YYYY-MM-DDTHH:mm'
        )
      }
    })

  return {
    courier: REF,
    number: $('span.tracking-number').text().trim(),
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function usps(): Courier {
  return createCourier(COURIER.USPS, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      return parse(response.body)
    }
  })
}
