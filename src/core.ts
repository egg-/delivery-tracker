import dayjs from './dayjs.js'

export const STATUS = {
  INFO_RECEIVED: 'InfoReceived',
  PENDING: 'Pending',
  IN_TRANSIT: 'InTransit',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
  EXCEPTION: 'Exception',
  FAIL_ATTEMPT: 'FailAttempt'
} as const

export type Status = (typeof STATUS)[keyof typeof STATUS]

export const ERROR = {
  UNKNOWN: -1,
  NOT_SUPPORT_SHIPMENT: 20,
  SEARCH_AGAIN: 21,
  INVALID_NUMBER: 10,
  INVALID_NUMBER_LENGTH: 11,
  INVALID_NUMBER_HEADER: 12,
  INVALID_NUMBER_COUNTRY: 13,
  REQUIRED_APIKEY: 30,
  SERVER_ERROR: 500
} as const

const ERROR_MESSAGE: Record<number, string> = {
  30: 'required apikey.',
  20: 'shipment does not support.',
  21: 'working on it. Please search it again.',
  10: 'invalid trace number.',
  11: 'invalid trace number.',
  12: 'invalid trace number.',
  13: 'invalid trace number.'
}

/** Every rejection from `trace()` is a `TrackerError`, so `err.code` is always readable. */
export class TrackerError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'TrackerError'
    this.code = code
  }
}

/**
 * Builds a `TrackerError` the same way v2's `tracker.error()` built its plain object:
 * a known code carries its canned message, an unknown code falls back to the given
 * message, and a bare string becomes the message of an `UNKNOWN` error.
 */
export function trackerError(code: number | string, message?: string): TrackerError {
  if (typeof code === 'number' && ERROR_MESSAGE[code] !== undefined) {
    return new TrackerError(code, ERROR_MESSAGE[code])
  }
  if (message !== undefined) {
    return new TrackerError(typeof code === 'number' ? code : ERROR.UNKNOWN, message)
  }
  return new TrackerError(ERROR.UNKNOWN, String(code))
}

export interface CourierMeta {
  readonly CODE: string
  readonly NAME: string
}

export const COURIER = {
  KOREAPOST: { CODE: 'koreapost', NAME: 'Korea Post' },
  AUSPOST: { CODE: 'auspost', NAME: 'Australia Post' },
  PANTOS: { CODE: 'pantos', NAME: 'Pantos' },
  RINCOS: { CODE: 'rincos', NAME: 'RINCOS' },
  ROYALMAIL: { CODE: 'royalmail', NAME: 'Royal Mail' },
  CJKOREAEXPRESS: { CODE: 'cjkoreaexpress', NAME: 'CJ Korea Express' },
  POSLAJU: { CODE: 'poslaju', NAME: 'POS Laju' },
  EFS: { CODE: 'efs', NAME: 'EFS' },
  TNT: { CODE: 'tnt', NAME: 'TNT' },
  CESCO: { CODE: 'cesco', NAME: 'CESCO' },
  XPOST: { CODE: 'xpost', NAME: 'XPOST' },
  SICEPAT: { CODE: 'sicepat', NAME: 'SICEPAT' },
  EPARCEL: { CODE: 'eparcel', NAME: 'eParcel' },
  LBC: { CODE: 'lbc', NAME: 'LBC' },
  JNT: { CODE: 'jnt', NAME: 'J&T' },
  DHL: { CODE: 'dhl', NAME: 'DHL' },
  CANADAPOST: { CODE: 'canadapost', NAME: 'Canada Post' }
} as const satisfies Record<string, CourierMeta>

export type CourierKey = keyof typeof COURIER
export type CourierCode = (typeof COURIER)[CourierKey]['CODE']

/** Courier identity as it appears on a result, lowercased. */
export interface CourierRef {
  code: string
  name: string
}

export interface Checkpoint {
  courier: CourierRef
  location: string
  message: string
  status: Status
  time: string
}

export interface TraceResult {
  courier: CourierRef
  number: string
  status: Status
  checkpoints: Checkpoint[]
  /** Estimated delivery date, when the courier reports one (currently FedEx only). */
  eta?: string
}

export interface CourierOptions {
  apikey?: string
}

export interface Courier {
  readonly code: string
  readonly name: string
  /**
   * The HTTP call(s) `trace()` will make. Exposed so tests can stub them, and
   * so callers can see what the library talks to.
   */
  trackingInfo(number: string): TrackingInfo
  trace(number: string): Promise<TraceResult>
}

export type CourierFactory = (opts?: CourierOptions) => Courier

export interface CourierHandlers {
  trackingInfo(number: string): TrackingInfo
  trace(number: string): Promise<TraceResult>
}

/**
 * Wraps a courier's handlers so every rejection is a `TrackerError`. Scrapers fail in
 * whatever way the remote page happens to break — a missing property, malformed JSON —
 * and callers should not have to tell those apart from a tracking failure.
 */
export function createCourier(meta: CourierMeta, handlers: CourierHandlers): Courier {
  return {
    code: meta.CODE,
    name: meta.NAME,
    trackingInfo: handlers.trackingInfo,
    async trace(number: string): Promise<TraceResult> {
      try {
        return await handlers.trace(number)
      } catch (err) {
        if (err instanceof TrackerError) {
          throw err
        }
        throw trackerError(err instanceof Error ? err.message : String(err))
      }
    }
  }
}

/** A single request, or a named set of them for couriers that need several round trips. */
export type TrackingInfo =
  | TrackingRequest
  | Record<string, TrackingRequest | TrackingRequestFactory>

export interface TrackingRequest {
  url: string
  method?: 'GET' | 'POST'
  json?: boolean
  form?: Record<string, string>
  formData?: Record<string, string>
  body?: string | object
  headers?: Record<string, string>
  rejectUnauthorized?: boolean
  /** Extra POST payload some couriers keep separate from `form`. */
  data?: Record<string, string>
}

export type TrackingRequestFactory = (...args: string[]) => TrackingRequest

const EXCEPTION_AFTER_SECONDS = 259200 // 3 days without an update

/**
 * Picks the status for a whole shipment from its checkpoints. The last checkpoint is
 * not authoritative — local carriers often report out of order — so a `Delivered`
 * checkpoint anywhere wins, and a shipment that has sat in transit for three days
 * becomes an `Exception`.
 */
export function normalizeStatus(checkpoints: Checkpoint[]): Status {
  let isDelivered = false
  let latest: Checkpoint | null = null

  for (const checkpoint of checkpoints) {
    isDelivered = isDelivered || checkpoint.status === STATUS.DELIVERED
    if ((checkpoint.status === STATUS.DELIVERED || latest === null) && checkpoint.time) {
      latest = checkpoint
    }
  }

  if (latest === null) {
    return STATUS.PENDING
  }

  const status = isDelivered ? STATUS.DELIVERED : latest.status
  if (status === STATUS.IN_TRANSIT || status === STATUS.FAIL_ATTEMPT) {
    if (dayjs().unix() - dayjs(latest.time).unix() > EXCEPTION_AFTER_SECONDS) {
      return STATUS.EXCEPTION
    }
  }
  return status
}
