import type { Courier, TrackingRequest, TrackingRequestFactory } from '../../src/core.js'
import prepareNock from './prepareNock.js'

function isRequest(value: unknown): value is TrackingRequest {
  return typeof value === 'object' && value !== null && 'url' in value
}

/**
 * Stubs every request a courier makes for `number`, reading each response from
 * `test/fixtures/<code>-<number>[-<step>]`.
 */
export default function prepare(courier: Courier, number: string): void {
  const info = courier.trackingInfo(number)

  if (isRequest(info)) {
    prepareNock(info, `${courier.code}-${number}`)
    return
  }

  for (const [step, value] of Object.entries(info)) {
    const filename = `${courier.code}-${number}-${step}`
    if (typeof value === 'function') {
      prepareNock((value as TrackingRequestFactory)(), filename)
    } else if (isRequest(value)) {
      prepareNock(value, filename)
    }
  }
}
