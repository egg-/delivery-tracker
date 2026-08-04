import {
  type Checkpoint,
  COURIER,
  type Courier,
  createCourier,
  normalizeStatus,
  STATUS,
  type Status,
  type TraceResult,
  type TrackingRequest
} from '../core.js'
import dayjs from '../dayjs.js'
import { request } from '../http.js'
import { load } from '../scrape.js'

const REF = { code: COURIER.CESCO.CODE, name: COURIER.CESCO.NAME }

/** The page prints Indonesian month abbreviations. */
const MONTHS: Record<string, string> = {
  jan: 'January',
  feb: 'February',
  mar: 'March',
  apr: 'April',
  mei: 'May',
  jun: 'June',
  jul: 'July',
  agu: 'August',
  sep: 'September',
  okt: 'October',
  nov: 'November',
  des: 'December'
}

const STATUS_MAP: Record<string, Status> = {
  booking: STATUS.INFO_RECEIVED,
  pickup: STATUS.PENDING,
  delivery: STATUS.IN_TRANSIT,
  delivered: STATUS.DELIVERED
}

const DATE_PATTERN = /date:\s+(\w+). (\d+), (\d+)/m

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'POST',
    url: 'https://cesco-logistics.com/cari.php',
    data: { q: number }
  }
}

function parseTime(text: string): string | null {
  const matches = text.match(DATE_PATTERN)
  if (!matches) {
    return null
  }

  const [, rawMonth = '', date = '', year = ''] = matches
  const month = MONTHS[rawMonth.toLowerCase()] ?? rawMonth

  return dayjs([month, date, year, '+0700'].join(' '), 'MMMM DD YYYY Z').format()
}

function parse(html: string, number: string): TraceResult {
  const $ = load(html)
  const checkpoints: Checkpoint[] = []

  for (const el of $('.col-sm-3').toArray()) {
    const $el = $(el)
    const message = $el.text().replace(/[\n\t]/gi, '')
    const time = parseTime(message)

    if (!time) {
      continue
    }

    checkpoints.push({
      courier: REF,
      location: '',
      message,
      status: STATUS_MAP[$el.find('h2').text().toLowerCase()] ?? STATUS.IN_TRANSIT,
      time
    })
  }

  checkpoints.reverse()

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function cesco(): Courier {
  return createCourier(COURIER.CESCO, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const info = trackingInfo(number)
      // cesco's certificate is still invalid, so verification has to be off for this host.
      const response = await request({
        ...info,
        form: info.data,
        rejectUnauthorized: false
      })
      return parse(response.body, number)
    }
  })
}
