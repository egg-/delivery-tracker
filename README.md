# delivery-tracker

[![version](https://img.shields.io/npm/v/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker) [![download](https://img.shields.io/npm/dm/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker)
[![status status](https://github.com/egg-/delivery-tracker/workflows/Node.js%20CI/badge.svg)](https://github.com/egg-/delivery-tracker/actions)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa.svg)](https://biomejs.dev)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

delivery-tracker is delivery tracking library for Node.js

## Courier List

Status reflects an endpoint probe run on **2026-08-05** — see [Courier status](#courier-status).

| Name                     | Contributor     | Link                                                        | Status         |
| ------------------------ | --------------- | ----------------------------------------------------------- | -------------- |
| Korea Post               | @egg-           | http://www.koreapost.go.kr/                                 | reachable      |
| FedEx                    | @egg-           | https://www.fedex.com/                                      | **broken**     |
| Australia Post           | @egg-           | https://auspost.com.au/                                     | **broken**     |
| Pantos                   | @egg-           | http://www.epantos.com/                                     | reachable      |
| Rincos                   | @egg-           | http://www.rincos.co.kr/                                    | **broken**     |
| Royal Mail               | @egg-           | http://www.royalmail.com/                                   | **broken**     |
| USPS                     | @egg-           | https://www.usps.com/                                       | **broken**     |
| CJ Korea Express (Korea) | @egg-           | http://cjkoreaexpress.co.kr/ (https://www.doortodoor.co.kr) | reachable      |
| POS Laju                 | @egg-           | http://www.poslaju.com.my                                   | **broken**     |
| EFS                      | @egg-           | http://efs.asia/                                            | reachable      |
| UPS                      | @egg-           | https://www.ups.com                                         | reachable      |
| TNT                      | @egg-           | https://www.tnt.com                                         | reachable      |
| CESCO                    | @egg-           | https://www.cesco-logistics.com/                            | reachable      |
| XPOST                    | @egg-           | https://www.xpost.ph/                                       | **broken**     |
| SICEPAT                  | @egg-           | http://sicepat.com/                                         | needs API key  |
| eParcel                  | @egg-           | https://eparcel.kr/                                         | reachable      |
| LBC                      | @egg-           | https://www.lbcexpress.com/                                 | reachable      |
| J&T (PH)                 | @egg-           | https://www.jtexpress.ph/                                   | reachable      |
| DHL                      | @carstenschwede | https://www.dhl.com/                                        | needs API key  |
| Canada Post              | @egg-           | https://www.canadapost-postescanada.ca/                     | **broken**     |
| PAXEL                    | @egg-           | https://paxel.co/                                           | **broken**     |

## Courier status

Most couriers here are HTML scrapers pointed at pages that have since been rewritten.
The test suite replays responses recorded in `test/fixtures`, so **a green build says the
parser still handles the recorded page — not that the courier still works.** Seven of the
recordings date from 2017.

An endpoint probe on 2026-08-05 — one request per courier, using a dummy tracking
number — sorted them into:

* **broken** — the host answers but the endpoint does not: `404` for `auspost`, `rincos`
  and `xpost`; `403` for `fedex`, `canadapost` and `paxel`; `poslaju` now redirects to
  the pos.com.my home page, and `royalmail`/`usps` have moved their tracking pages.
* **needs API key** — `dhl` answered `401` and `sicepat` `403` to a dummy key, which is
  the expected response. Both look correctly wired.
* **reachable** — the first request succeeded. For the multi-step couriers (`pantos`,
  `ups`, `cjkoreaexpress`, `jnt`, `lbc`) that first request is only a landing page, so
  this is weak evidence. Confirming any of these needs a real tracking number.

Five couriers were dropped in 3.0.0 because their hostname no longer resolves at all —
see the changelog. They remain in git history if anyone needs the parsers back.

Re-recording a fixture is the way to fix a **broken** courier: capture a live response
into `test/fixtures/<code>-<number>` and adjust the parser until the test passes.

## Installation

Requires Node.js 20 or later. The package is written in TypeScript, ships its own type
declarations, and is **ESM only** — `require()` is not supported.

```sh
$ npm install delivery-tracker
```

## Usage

`trace()` returns a promise. It resolves with the tracking result, or rejects with a
`TrackerError` carrying a `code` from `ERROR`.

```javascript
import { COURIER, courier } from 'delivery-tracker'

const koreapost = courier(COURIER.KOREAPOST.CODE)
const result = await koreapost.trace('TRACE_NUMBER')

console.log(result.status, result.checkpoints.length)
```

Couriers that need credentials take them as the second argument:

```javascript
const sicepat = courier(COURIER.SICEPAT.CODE, { apikey: 'YOUR_API_KEY' })
```

Handling failures:

```javascript
import { ERROR, TrackerError, COURIER, courier } from 'delivery-tracker'

try {
  await courier(COURIER.KOREAPOST.CODE).trace('BADNUMBER')
} catch (err) {
  if (err instanceof TrackerError && err.code === ERROR.INVALID_NUMBER_LENGTH) {
    // ...
  }
}
```

### TypeScript

Types come with the package — no `@types/` install. Courier codes are checked at compile
time, so a typo is a build error rather than a runtime throw.

```typescript
import { COURIER, courier, type TraceResult } from 'delivery-tracker'

const client = courier(COURIER.SICEPAT.CODE, { apikey: 'YOUR_API_KEY' })
const result: TraceResult = await client.trace('TRACE_NUMBER')
```

### Command Line

```sh
$ npm install -g delivery-tracker
$ delivery-tracker -h

Usage: delivery-tracker [options] <tracecode>

Options:
  -c, --courier <courier>  Courier Namespace
  -k, --apikey <apikey>    API KEY
  -h, --help               display help for command

$ delivery-tracker -c KOREAPOST EBXXXXXXXXXKR
```

## Response

| Attribute   | Type                       | Description                          |
| ----------- | -------------------------- | ------------------------------------ |
| courier     | Courier Object             | courier information                  |
| number      | String                     | tracking number                      |
| status      | String                     | delivery status                      |
| checkpoints | Array of Checkpoint Object | Array of the checkpoint information. |

### Courier Object

| Attribute | Type   | Description             |
| --------- | ------ | ----------------------- |
| code      | String | Unique code of courier. |
| name      | String | Courier name            |

### Checkpoint Object

| Attribute | Type           | Description                                                                                                                                                                |
| --------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| courier   | Courier Object | courier information                                                                                                                                                        |
| location  | String         | Location info of the checkpoint provided by the courier.                                                                                                                   |
| message   | String         | Checkpoint message                                                                                                                                                         |
| time      | String         | The date and time of the checkpoint provided by the courier. The values can be:<br>Empty string,<br> YYYY-MM-DD,<br> YYYY-MM-DDTHH:mm:ss <br> YYYY-MM-DDTHH:mm:ss+Timezone |

## CODE

All three are named exports: `import { COURIER, STATUS, ERROR } from 'delivery-tracker'`.

### COURIER

`COURIER.{NAMESPACE}`

| NAMESPACE      | CODE           | NAME             |
| -------------- | -------------- | ---------------- |
| KOREAPOST      | koreapost      | Korea Post       |
| FEDEX          | fedex          | FedEx            |
| AUSPOST        | auspost        | Australia Post   |
| PANTOS         | pantos         | Pantos           |
| RINCOS         | rincos         | RINCOS           |
| ROYALMAIL      | royalmail      | Royal Mail       |
| USPS           | usps           | USPS             |
| CJKOREAEXPRESS | cjkoreaexpress | CJ Korea Express |
| POSLAJU        | poslaju        | POS Laju         |
| EFS            | efs            | EFS              |
| UPS            | ups            | UPS              |
| TNT            | tnt            | TNT              |
| CESCO          | cesco          | CESCO            |
| XPOST          | xpost          | XPOST            |
| SICEPAT        | sicepat        | SICEPAT          |
| EPARCEL        | eparcel        | eParcel          |
| LBC            | lbc            | LBC              |
| JNT            | jnt            | J&T              |
| DHL            | dhl            | DHL              |
| CANADAPOST     | canadapost     | Canada Post      |
| PAXEL          | paxel          | Paxel            |

### STATUS

`STATUS.{CODE}`

| Code          | Value        | Description                                                                         |
| ------------- | ------------ | ----------------------------------------------------------------------------------- |
| INFO_RECEIVED | InfoReceived | The carrier received a request from the shipper and wants to start shipping.        |
| PENDING       | Pending      | New pending shipment to track or a new shipment without tracking information added. |
| IN_TRANSIT    | InTransit    | The carrier has received or received the carrier. Shipment is in progress.          |
| DELIVERED     | Delivered    | The shipment was successfully delivered.                                            |
| RETURNED      | Returned     | The shipment was returned.                                                          |
| EXCEPTION     | Exception    | Custom hold, undeliverable, shipper has shipped or shipped an exception.            |
| FAIL_ATTEMPT  | FailAttempt  | The courier tried to send but failed, but usually reminds and tries again.          |

### ERROR

`ERROR.{CODE}` — the value a rejected `trace()` carries on `TrackerError.code`.

| Code                   | Value | Description                            |
| ---------------------- | ----- | -------------------------------------- |
| UNKNOWN                | -1    | Unknown error                          |
| INVALID_NUMBER         | 10    | invalid trace number.                  |
| INVALID_NUMBER_LENGTH  | 11    | invalid trace number.                  |
| INVALID_NUMBER_HEADER  | 12    | invalid trace number.                  |
| INVALID_NUMBER_COUNTRY | 13    | invalid trace number.                  |
| NOT_SUPPORT_SHIPMENT   | 20    | shipment does not support.             |
| SEARCH_AGAIN           | 21    | working on it. Please search it again. |
| REQUIRED_APIKEY        | 30    | required apikey.                       |
| SERVER_ERROR           | 500   | upstream server error                  |

### Sample

```javascript
// KOREAPOST
{
  "courier": {
    "code": "koreapost",
    "name": "Korea Post"
  },
  "number": "EBCOMPLETE0KR",
  "status": "Delivered",
  "checkpoints": [
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "MY4332",
      "message": "Delivery complete\nRecipient : K*NG()\nResult : Delivery complete",
      "time": "2016-07-04T11:40:00"
    },
    // ...
  ]
}

// FEDEX
{
  "courier": {
    "code": "fedex",
    "name": "FedEx"
  },
  "number": "DELIVEREDNUM",
  "status": "Delivered",
  "checkpoints": [
    {
      "courier": {
        "code": "fedex",
        "name": "FedEx"
      },
      "location": "SOUTH JORDAN, UT",
      "message": "Package delivered by U.S. Postal Service to addressee",
      "status": "Delivered",
      "time": "2016-12-14T13:17:00-07:00"
    },
    // ...
  ]
}

// PANTOS
{
  "courier": {
    "code": "pantos",
    "name": "Pantos"
  },
  "number": "DELIVEREDNUM-AUSPOST",
  "status": "Delivered",
  "checkpoints": [
    {
      "courier": {
        "code": "auspost",
        "name": "Australia Post"
      },
      "location": "Canning Vale, WA",
      "message": "Delivered",
      "status": "Delivered",
      "time": "2017-01-03T15:24:00+08:00"
    },
    // ...
    {
      "courier": {
        "code": "pantos",
        "name": "Pantos"
      },
      "location": "KRICN",
      "message": "Pick-Up (Pick-Up)",
      "status": "InfoReceived",
      "time": "2016-12-20T11:25"
    }
  ]
}
```

## Development

Lint (Biome) + typecheck (tsc) + test (mocha):

```bash
$ npm test
```

Individually:

```bash
$ npm run lint        # biome check
$ npm run lint:fix    # biome check --write
$ npm run typecheck   # tsc --noEmit, covers src and test
$ npm run test:unit   # mocha only
$ npm run test:watch
$ npm run build       # emit dist/ (js + .d.ts)
```

Tests run straight off the TypeScript sources via `tsx`, and replay recorded responses
from `test/fixtures` with `nock` — nothing hits the network.

### Adding a courier

1. Add an entry to `COURIER` in `src/core.ts`.
2. Add `src/courier/<code>.ts` exporting a default factory built with `createCourier()`.
3. Register the factory in `FACTORIES` in `src/index.ts`.
4. Record a response into `test/fixtures/<code>-<number>` and add `test/<code>.test.ts`.

## Reporting a broken courier

These couriers are scraped from pages that change without notice, and the maintainers
cannot reproduce a failure without seeing the response the courier actually returned.
**A report that says only "koreapost is broken" cannot be acted on.**

Please include one of the following — the second option if the first is not acceptable
to you:

### Option 1 — a tracking number

The most useful thing you can send. Pick a shipment that is **already delivered and no
longer sensitive to you**, since anyone reading the issue can look it up.

### Option 2 — a recorded response, with personal data removed

If you cannot share a number — a tracking number resolves to a delivery address, times
and often a recipient name, so treating it as personal data is reasonable — send the raw
response instead. It is what the test suite replays, so it is just as useful:

```javascript
import { writeFileSync } from 'node:fs'
import { COURIER, courier, request } from 'delivery-tracker'

const client = courier(COURIER.KOREAPOST.CODE)
const info = client.trackingInfo('YOUR_NUMBER')

// `data` holds the POST payload for the couriers that use one.
const response = await request({ ...info, form: info.data ?? info.form })
writeFileSync('koreapost-DELIVERED', response.body)
```

Before attaching the file, please **redact it**:

1. Replace every occurrence of the real tracking number with a placeholder that says
   what the case is — `DELIVERED`, `INTRANSIT`, `INVALIDNUM`. Replace it **inside the
   body too**, not just in the filename: the parsers read the number back out of the
   response, so the tests match on it.
2. Remove recipient and sender names, phone numbers, full addresses and signature
   images. The parsers only need the status text, location and timestamp.

Name the file `<code>-<placeholder>`, matching `test/fixtures`.

### Either way, please also say

* the courier code, and the tracking number's country if the courier serves several
* what you expected and what you got — an error (with its `code`), an empty
  `checkpoints`, or wrong `time` values
* `delivery-tracker` and Node.js versions

## Contributing

Bug reports and pull requests are welcome on Github at [https://github.com/egg-/delivery-tracker](https://github.com/egg-/delivery-tracker)

1. Fork it
1. Create your feature branch.
1. Commit your changes.
1. Push to the branch.
1. Create a new Pull Request.

## Release History

See the [CHANGELOG.md](CHANGELOG.md)

## License

delivery-tracker is licensed under the [MIT license](https://github.com/egg-/delivery-tracker/blob/master/LICENSE).
