# delivery-tracker

[![version](https://img.shields.io/npm/v/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker) [![download](https://img.shields.io/npm/dm/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker)
[![status status](https://github.com/egg-/delivery-tracker/workflows/Node.js%20CI/badge.svg)](https://github.com/egg-/delivery-tracker/actions)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa.svg)](https://biomejs.dev)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

delivery-tracker is delivery tracking library for Node.js

## Courier List

Status comes from `npm run probe`, last run on **2026-09-21** — see
[Courier status](#courier-status).

| Name                     | Contributor     | Link                                                        | Status        |
| ------------------------ | --------------- | ----------------------------------------------------------- | ------------- |
| Korea Post               | @egg-           | http://www.koreapost.go.kr/                                 | answers       |
| Australia Post           | @egg-           | https://auspost.com.au/                                     | **blocked**   |
| Pantos                   | @egg-           | http://www.epantos.com/                                     | **verified**  |
| Rincos                   | @egg-           | http://www.rincos.co.kr/                                    | answers       |
| CJ Korea Express (Korea) | @egg-           | http://cjkoreaexpress.co.kr/ (https://www.doortodoor.co.kr) | **verified**  |
| POS Laju                 | @egg-           | https://tracking.pos.com.my/                                | answers       |
| EFS                      | @egg-           | http://efs.asia/                                            | answers       |
| TNT                      | @egg-           | https://www.tnt.com                                         | answers       |
| CESCO                    | @egg-           | https://www.cesco-logistics.com/                            | answers       |
| XPOST                    | @egg-           | https://www.xpost.ph/                                       | answers       |
| SICEPAT                  | @egg-           | http://sicepat.com/                                         | needs API key |
| eParcel                  | @egg-           | https://eparcel.kr/                                         | answers       |
| LBC                      | @egg-           | https://www.lbcexpress.com/                                 | answers       |
| J&T (PH)                 | @egg-           | https://www.jtexpress.ph/                                   | **blocked**   |
| DHL                      | @carstenschwede | https://www.dhl.com/                                        | needs API key |
| Canada Post              | @egg-           | https://www.canadapost-postescanada.ca/                     | **verified**  |

## Courier status

Most couriers here are HTML scrapers pointed at pages that change without notice. The
test suite replays responses recorded in `test/fixtures`, so **a green build says the
parser still handles the recorded response — not that the courier still works.**

`npm run probe` asks every courier about a number that does not exist and prints what
came back, which is how the table above is filled in. It talks to the couriers, so it
needs network access and is deliberately not part of `npm test`.

Statuses, most to least trustworthy:

* **verified** — traced end to end against a real shipment: `cjkoreaexpress`,
  `canadapost` and `pantos`. All three were found broken this way and fixed.
* **needs API key** — `dhl` and `sicepat` reject a probe key with `REQUIRED_APIKEY`,
  which is what a correctly wired client should get. Neither has been tried with a real
  key.
* **answers** — reachable, and it handles a number that does not exist: `koreapost`,
  `rincos`, `poslaju`, `efs`, `tnt`, `cesco`, `xpost`, `eparcel` and `lbc`. That proves
  the request still reaches a live endpoint and the response still parses. It does not
  prove the populated page parses correctly — confirming that needs a real number.
* **blocked** — the courier refuses automated clients. `auspost` withdrew the tracking
  API this library used (every id now answers `404`) and put a bot challenge in front of
  the one its own site calls; `jnt` moved its query behind a slider captcha. Both reject
  with `SERVER_ERROR` and say so in the message. This library scrapes what a courier
  serves to an ordinary client; where a courier has decided not to serve that, the answer
  is its official API or a tracking aggregator, not a workaround.

Some couriers cannot tell an unknown number from a shipment they have not scanned yet —
`cjkoreaexpress`, `efs`, `eparcel` and `lbc` answer both with `Pending` and an empty
`checkpoints`. That is the library reporting "the courier has nothing for this number".

Ten couriers were dropped in 3.0.0: five had a hostname that no longer resolves, and
five — `usps`, `fedex`, `ups`, `paxel` and `royalmail` — refuse automated requests. Their
parsers remain in git history.

A note on how those were told apart, because it is easy to get wrong in both directions.
A first request returning `200` proves very little. `ups` served a normal page and then
refused the API call behind it. `royalmail` served a 175KB page that turned out to be a
shell, while the endpoint holding the actual data simply never answered. In the other
direction `canadapost` returned `403` and looked blocked, but was only rejecting a
request that did not match the shape its own page sends, and it works again. The only
reliable test is a real tracking number.

## Installation

Requires Node.js 20 or later. The package is written in TypeScript and ships its own type
declarations.

It is published as ESM, so `import` is the supported form. `require()` also works on Node
versions that can require an ES module — confirmed on 20.20 and 22.17, while 20.10 fails
with `ERR_REQUIRE_ESM`. Use `import` if you want it to work everywhere.

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
| AUSPOST        | auspost        | Australia Post   |
| PANTOS         | pantos         | Pantos           |
| RINCOS         | rincos         | RINCOS           |
| CJKOREAEXPRESS | cjkoreaexpress | CJ Korea Express |
| POSLAJU        | poslaju        | POS Laju         |
| EFS            | efs            | EFS              |
| TNT            | tnt            | TNT              |
| CESCO          | cesco          | CESCO            |
| XPOST          | xpost          | XPOST            |
| SICEPAT        | sicepat        | SICEPAT          |
| EPARCEL        | eparcel        | eParcel          |
| LBC            | lbc            | LBC              |
| JNT            | jnt            | J&T              |
| DHL            | dhl            | DHL              |
| CANADAPOST     | canadapost     | Canada Post      |

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

// POS LAJU
{
  "courier": {
    "code": "poslaju",
    "name": "POS Laju"
  },
  "number": "EPXXXXXXXXXMY",
  "status": "Delivered",
  "checkpoints": [
    {
      "courier": {
        "code": "poslaju",
        "name": "POS Laju"
      },
      "location": "Pusat POS Laju Kepong",
      "message": "We have delivered your parcel. Thank you!",
      "status": "Delivered",
      "time": "2023-08-23T13:40:28"
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
  "number": "PKRXXXXXXXXX",
  "status": "Delivered",
  "checkpoints": [
    {
      "courier": {
        "code": "pantos",
        "name": "Pantos"
      },
      "location": "JAPAN",
      "message": "Destination Delivery",
      "status": "Delivered",
      "time": "2025-04-13T12:09"
    },
    // ...
    {
      "courier": {
        "code": "pantos",
        "name": "Pantos"
      },
      "location": "KOREA, REPUBLIC OF",
      "message": "Label Created",
      "status": "InTransit",
      "time": "2025-04-08T11:55"
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
$ npm run probe       # ask every courier about a number that does not exist (network)
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
