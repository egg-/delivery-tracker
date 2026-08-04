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
import { inputValue, load } from '../scrape.js'

const REF = { code: COURIER.KOREAPOST.CODE, name: COURIER.KOREAPOST.NAME }

const NUMBER_LENGTH = 13
const SINGLE_CHAR_PREFIXES = ['C', 'R', 'V', 'E', 'G', 'U', 'B', 'L']

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'https://trace.epost.go.kr/xtts/servlet/kpl.tts.common.svl.SttSVL',
    data: {
      target_command: 'kpl.tts.tt.epost.cmd.RetrieveEmsTraceEngCmd',
      POST_CODE: number
    }
  }
}

function isValidHeader(number: string): boolean {
  const country = number.slice(-2).toUpperCase()
  const prefix = number.slice(0, 1).toUpperCase()

  // ponytail: kept as-is from epost_trace.js. 'LK'/'ZZ' can never match a one-character
  // slice, so those branches are unreachable — left in place rather than silently
  // changing which numbers the library accepts.
  if (prefix === 'LK') {
    return country === 'KR' || country === 'AU'
  }
  if (prefix === 'ZZ') {
    return country === 'KR'
  }
  return SINGLE_CHAR_PREFIXES.includes(prefix)
}

function isValidCountry(number: string): boolean {
  const country = number.slice(-2).toUpperCase()
  return /^[A-Z]{2}$/.test(country)
}

/** @see https://service.epost.go.kr//postal/jscripts/epost_trace.js */
function validate(number: string): number | null {
  const trimmed = number.trim()

  if (trimmed.length !== NUMBER_LENGTH) {
    return ERROR.INVALID_NUMBER_LENGTH
  }
  if (!isValidHeader(trimmed)) {
    return ERROR.INVALID_NUMBER_HEADER
  }
  if (!isValidCountry(trimmed)) {
    return ERROR.INVALID_NUMBER_COUNTRY
  }
  return null
}

function toStatus(message: string): Checkpoint['status'] {
  if (message.includes('Delivery complete') || message.includes('Final Delivery')) {
    return STATUS.DELIVERED
  }
  if (message.includes('Unsuccessful delivery')) {
    return STATUS.FAIL_ATTEMPT
  }
  if (message.includes('Posting/Collection')) {
    return STATUS.INFO_RECEIVED
  }
  return STATUS.IN_TRANSIT
}

function parse(html: string): TraceResult {
  const $ = load(html)
  const checkpoints: Checkpoint[] = []

  const rows = $('.table_col').find('tr').toArray()
  for (let i = 1; i < rows.length; i++) {
    const cols = $(rows[i]).find('td')
    if (cols.length === 1) {
      break
    }

    const parts = [cols.eq(1).text().trim()]
    cols
      .eq(3)
      .find('p')
      .each((_, el) => {
        parts.push(
          $(el)
            .text()
            .trim()
            .replace(/\t/gim, '')
            .replace(/\s{2,}/gi, ' ')
        )
      })
    const message = parts.join(' - ')

    checkpoints.push({
      courier: REF,
      location: cols.eq(2).text().trim(),
      message,
      status: toStatus(message),
      time: dayjs(cols.eq(0).text().trim(), 'HH:mm DD-MMM-YYYY').format('YYYY-MM-DDTHH:mm:ss')
    })
  }

  checkpoints.reverse()

  return {
    courier: REF,
    number: inputValue($, '#POST_CODE'),
    status: normalizeStatus(checkpoints),
    checkpoints
  }
}

export default function koreapost(): Courier {
  return createCourier(COURIER.KOREAPOST, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const invalid = validate(number)
      if (invalid !== null) {
        throw trackerError(invalid)
      }

      const info = trackingInfo(number)
      const response = await request({ ...info, form: info.data })
      return parse(response.body)
    }
  })
}
