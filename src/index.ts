import {
  COURIER,
  type Courier,
  type CourierCode,
  type CourierFactory,
  type CourierOptions,
  ERROR,
  trackerError
} from './core.js'
import auspost from './courier/auspost.js'
import canadapost from './courier/canadapost.js'
import cesco from './courier/cesco.js'
import cjkoreaexpress from './courier/cjkoreaexpress.js'
import dhl from './courier/dhl.js'
import efs from './courier/efs.js'
import eparcel from './courier/eparcel.js'
import fedex from './courier/fedex.js'
import jnt from './courier/jnt.js'
import koreapost from './courier/koreapost.js'
import lbc from './courier/lbc.js'
import pantos from './courier/pantos.js'
import paxel from './courier/paxel.js'
import poslaju from './courier/poslaju.js'
import rincos from './courier/rincos.js'
import royalmail from './courier/royalmail.js'
import sicepat from './courier/sicepat.js'
import tnt from './courier/tnt.js'
import ups from './courier/ups.js'
import usps from './courier/usps.js'
import xpost from './courier/xpost.js'

export * from './core.js'
export type { HttpResponse } from './http.js'
export { CookieJar, createSession, parseJson, request } from './http.js'

const FACTORIES = {
  [COURIER.AUSPOST.CODE]: auspost,
  [COURIER.CANADAPOST.CODE]: canadapost,
  [COURIER.CESCO.CODE]: cesco,
  [COURIER.CJKOREAEXPRESS.CODE]: cjkoreaexpress,
  [COURIER.DHL.CODE]: dhl,
  [COURIER.EFS.CODE]: efs,
  [COURIER.EPARCEL.CODE]: eparcel,
  [COURIER.FEDEX.CODE]: fedex,
  [COURIER.JNT.CODE]: jnt,
  [COURIER.KOREAPOST.CODE]: koreapost,
  [COURIER.LBC.CODE]: lbc,
  [COURIER.PANTOS.CODE]: pantos,
  [COURIER.PAXEL.CODE]: paxel,
  [COURIER.POSLAJU.CODE]: poslaju,
  [COURIER.RINCOS.CODE]: rincos,
  [COURIER.ROYALMAIL.CODE]: royalmail,
  [COURIER.SICEPAT.CODE]: sicepat,
  [COURIER.TNT.CODE]: tnt,
  [COURIER.UPS.CODE]: ups,
  [COURIER.USPS.CODE]: usps,
  [COURIER.XPOST.CODE]: xpost
} as Record<CourierCode, CourierFactory>

/** Builds a courier client. Throws if the code is not a supported shipment. */
export function courier(code: CourierCode, opts?: CourierOptions): Courier {
  const factory = FACTORIES[code] as CourierFactory | undefined
  if (!factory) {
    throw trackerError(ERROR.NOT_SUPPORT_SHIPMENT)
  }
  return factory(opts)
}
