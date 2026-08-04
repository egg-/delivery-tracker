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
import { parseJson, request } from '../http.js'

const REF = { code: COURIER.TNT.CODE, name: COURIER.TNT.NAME }

interface StatusData {
  depot: string
  statusDescription: string
  groupCode: string
  localEventDate: string
}

interface Consignment {
  podFound?: boolean
  collectedDate?: string
  collectionDate?: string
  statusData: StatusData[]
}

interface Output {
  notFound?: boolean
  consignment: Consignment[]
}

interface Response {
  'tracker.output': Output
}

function trackingInfo(number: string): TrackingRequest {
  return {
    method: 'GET',
    url: `https://www.tnt.com/api/v2/shipment?con=${number}&searchType=CON&locale=en_US`,
    json: true
  }
}

/** TNT can return several consignments for one number; keep the most recently collected. */
function latestConsignment(items: Consignment[]): Consignment | undefined {
  return items
    .filter((item) => item.podFound)
    .sort(
      (a, b) =>
        new Date(b.collectedDate || b.collectionDate || 0).getTime() -
        new Date(a.collectedDate || a.collectionDate || 0).getTime()
    )[0]
}

function parse(output: Output, number: string): TraceResult {
  const checkpoints: Checkpoint[] = []
  const consignment = latestConsignment(output.consignment)

  for (const status of consignment?.statusData ?? []) {
    checkpoints.push({
      courier: REF,
      location: status.depot,
      message: status.statusDescription,
      status: status.groupCode === 'DELRED' ? STATUS.DELIVERED : STATUS.IN_TRANSIT,
      time: dayjs(status.localEventDate).format('YYYY-MM-DDTHH:mm')
    })
  }

  return { courier: REF, number, status: normalizeStatus(checkpoints), checkpoints }
}

export default function tnt(): Courier {
  return createCourier(COURIER.TNT, {
    trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      const response = await request(trackingInfo(number))
      const output = parseJson<Response>(response)['tracker.output']

      if (output.notFound) {
        throw trackerError(ERROR.INVALID_NUMBER)
      }
      return parse(output, number)
    }
  })
}
