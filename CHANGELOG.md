# 3.0.2

## Fixed
* `require('delivery-tracker/package.json')` threw `ERR_PACKAGE_PATH_NOT_EXPORTED`. The
  `exports` map now lists it, as tools that read a dependency's version expect.

# 3.0.1

Courier repairs, found by asking the couriers themselves rather than replaying fixtures.
`npm run probe` does that, and fills in the README's status table.

Before this release six of the sixteen couriers failed with an internal error — a
`TypeError` from the parser, a `JSON.parse` message, or a bare `Unauthorized`. Two more
reported "invalid number" from an endpoint that had moved, and one returned a result with
`number: undefined` for a parcel that does not exist. Fourteen now answer; the two that
do not are blocked by the courier and say so.

## Fixed
* `pantos` — the `.dev` endpoints it called answer `404`; tracking moved to
  `/eCommerce/action/portal.TrackingPopup.*`, which takes JSON and wraps its payload in
  `body`. Verified end to end against a real consignment. A handover to a courier that
  cannot be traced no longer loses Pantos's own checkpoints.
* `poslaju` — `poslaju.com.my/track-trace-v2/` is now the Pos Malaysia website; tracking
  moved to `ttu-svc.pos.com.my/api/trackandtrace/v1/request`. Rewritten against it.
* `rincos` — `tracking_web.asp` answers `404`; the form now posts `schTrackings` to
  `/tracking/TrackingInfo`. Rewritten against the current page. Its ORIGIN and
  DESTINATION tables are parsed by the column headers the page itself prints; only the
  "no tracking information" path could be verified against the live site.
* `xpost` — an unknown number answers `404` with a JSON body, which was parsed as a
  result: callers got `number: undefined` and `Pending` instead of an error.
* `canadapost` — an unknown pin answers `400`, which threw `TypeError: Cannot read
  properties of undefined`.
* `cesco` — "AIRWAYBILL NOT FOUND" was read as a shipment with no checkpoints.
* `dhl` and `sicepat` — a rejected API key answered `UNKNOWN`/`Unauthorized`, or a JSON
  syntax error from an HTML error page. Both now reject with `REQUIRED_APIKEY`.
* `auspost` and `jnt` — both now refuse automated clients (a bot challenge and a slider
  captcha). They reject with `SERVER_ERROR` naming the reason, instead of failing inside
  the parser. Nothing here works around either; see the README.
* Non-2xx responses and non-JSON bodies are turned into a `TrackerError` with a usable
  code (`ensureOk`, exported), rather than surfacing as a `TypeError` or a `JSON.parse`
  message. `parseJson` no longer lets a syntax error escape, which its own comment had
  claimed since 3.0.0.
* CLI: a failed lookup printed the whole stack trace into `node_modules`. It now prints
  the message and the error code (`invalid trace number. (code 10)`), and still exits 1.
* Test fixtures are matched by the tracking number in the request body, not by URL alone.
  Couriers that post every number to one URL were being handed whichever fixture was
  registered first, so the order of the `it()` blocks decided which response a test saw.

## Added
* `npm run probe [code...]` — asks every courier about a number that does not exist and
  prints what came back. It needs network access and is not part of `npm test`.
* `CHANGELOG.md` ships in the package; only the README did before.

## Notes
* Unchanged: `cjkoreaexpress`, `efs`, `eparcel` and `lbc` answer an unknown number with
  `Pending` and no checkpoints, because their responses do not distinguish it from a
  shipment that has not been scanned yet.
* 3.0.0 was published to npm under the `next` tag on 2026-08-05 and is unchanged by this
  release.

# 3.0.0

Rewritten in TypeScript. This release is **breaking** — see the migration notes below.

## Breaking
* **Published as ESM.** `import` is the supported form. `require()` still works on Node
  versions that support requiring an ES module (verified on 20.20 and 22.17), but fails
  with `ERR_REQUIRE_ESM` on older ones such as 20.10.
* **`trace()` returns a promise** instead of taking a callback.
  * `courier.trace(number, cb)` → `await courier.trace(number)`
  * Failures now **reject** with a `TrackerError` (an `Error` subclass with `.code`),
    where v2 passed a plain `{ code, message }` object to the callback.
* **Requires Node.js 20 or later.**
* `COURIER.DEPPON` removed — it had no implementation and threw on use.
* **Ten couriers removed.** Five have a hostname that no longer resolves, so they cannot
  work regardless of the parser: `ecargo`, `yelloexpress`, `kerrythai`, `xioexpress`,
  `airbridge`. Five more explicitly refuse automated requests and are dropped rather than
  worked around: `usps` (Akamai JavaScript challenge on every tracking URL, plus tracking
  API access limited to a caller's own Mailer IDs since 2026-04-01), `fedex` and `ups`
  (Akamai `Access Denied`), `paxel` (Cloudflare challenge) and `royalmail` (the tracking
  page is a shell and the endpoints that carry the data never answer, with reCAPTCHA and
  an Akamai sensor configured on the page). Their tests passed only
  because `nock` replayed recordings made in 2017–2024. The parsers and fixtures remain in
  git history.
* `pantos` no longer merges checkpoints from a US handover, since UPS, USPS and FedEx are
  gone; those shipments return Pantos's own checkpoints. Australian handovers to Australia
  Post still work.
* `tracker.error()` removed; use `TrackerError` / the exported `ERROR` codes.
* `cjkoreaexpress` checkpoints now carry `message` as a string, matching every other
  courier. It was an array in v2.
* DHL without an `apikey` now rejects instead of passing the error as a *result*.
* `lbc` no longer exposes `loadHash()`.

## Added
* Type declarations ship with the package; courier codes are checked at compile time.
* `Checkpoint`, `TraceResult`, `Courier`, `Status`, `CourierCode` and friends are exported.
* `checkpoints[].location` is always present (DHL used to omit it).
* CLI: `-c/--courier` is now case-insensitive, as the original validation intended.

## Fixed
* `canadapost` — the JSON endpoint now refuses requests that do not look like the tracking
  page's own XHR, so every lookup came back `403 "you need a business account"`. The
  courier loads the tracking page first and reuses that session, and sends the browser
  agent and referer the page sends. Two further problems surfaced once real data came
  back: events with no `locationAddr` (such as `Signature`) threw, and a parcel returned
  to the shipper reported `Delivered` because the hand-back is recorded as a delivery —
  `returnedToSender` is now honoured and maps to `Returned`. `Attempted` events map to
  `FailAttempt` rather than `InTransit`.
* `cjkoreaexpress` — CJ relabelled its final scan from `배달완료` to `배송완료` at some
  point after the 2020 recording, so completed deliveries were reported as `InTransit`
  and then aged into `Exception` after three days. Both spellings are now accepted, and a
  fixture recorded from the current API was added alongside the old one. Fixes #39.
* Corrected date formats that v2 got wrong. `moment` accepted them leniently and produced
  plausible but incorrect timestamps; these are now parsed properly.
  * `usps` and `royalmail` were fixed before it emerged that both block automated
    access, and were removed later in this release. Recorded here because the same class
    of bug may exist in couriers that remain: `usps` dropped the time entirely and
    reported every checkpoint at `00:00`, and `royalmail` read `18/01/17` + `23:53` as
    `2001-01-18T17:53` instead of `2017-01-18T23:53`.
  * `cesco` — Indonesian month names are expanded to full English names, so the format
    needs `MMMM` rather than `MMM`.
* `ups` and `usps` — UPS reported a 12-hour clock as `10:53 P.M.` while the format string
  read `HH:mm`, so every afternoon event landed twelve hours early, and USPS broke on runs
  of whitespace inside its date cell. Reported in #35 by @aldin-alagic in 2022; the fix
  could not be merged once the sources moved to `src/`, so it was reapplied here. Both
  couriers were removed later in this release.
* Added a sweep test asserting every courier's checkpoints carry a parseable timestamp —
  the per-courier tests only ever checked `number` and `status`. Timestamps that parse but
  land on the wrong hour are now asserted explicitly for the couriers above.

## Notes
* Added a "Reporting a broken courier" guide to the README and a matching GitHub issue
  form. A report needs either a tracking number or a recorded response to be actionable;
  since a tracking number resolves to an address, times and often a recipient name, the
  guide offers the recorded response as an equal alternative and explains how to capture
  and redact one.
* Documented courier status in the README, ordered by how much each status can be
  trusted. Of the sixteen couriers that remain, two are verified against a real shipment,
  two need an API key, eight answered a probe but are otherwise unproven, and four are
  **broken** — their endpoint moved, which a re-recorded fixture fixes. A passing build
  has never meant a courier works; the tests only replay recordings. That gap pre-dates
  this release.

## Changed
* Source moved to `src/`, published output is built to `dist/`.
* Couriers no longer index into a shared registry to reach each other; `pantos` imports
  the courier it hands off to directly.

## Dependencies
* Dropped the deprecated `request` in favour of the built-in `fetch` (`src/http.ts`).
* Replaced `moment` with `dayjs`; dropped `async` and the unused `xml2js`.
* `cheerio` upgraded to 1.x, imported via `cheerio/slim` to keep the htmlparser2 parser —
  the default parse5 parser injects `<tbody>` and breaks the existing `table > tr`
  selectors.
* `commander` 15.x, `mocha` 11.x, `nock` 14.x.
* Build/lint toolchain: TypeScript + `tsx`, and **Biome** in place of `standard`
  (whose last release was 2024-09).
* Dropped Grunt; everything runs through npm scripts.

# 2.8.0
* add paxel

# 2.7.3
* fixed an issue in USPS is not working

# 2.7.2
* fixed an issue in JNT is not working

# 2.7.1
* fixed an issue in JNT is not working

# 2.7.0
* add canada post

# 2.6.1
* add courier namespace for DHL.

# 2.6.0
* add DHL.

# 2.5.8
* add an exception logic for internal server error in JNT.

# 2.5.7
* add an exception logic for internal server error in SICEPAT.

# 2.5.6
* add an exception logic in SICEPAT.

# 2.5.5
* fixed an issue in SICEPAT is not working.

# 2.5.4
* fixed RTS issue in JNT.

# 2.5.3
* fixed an issue in EPARCEL is not working.

# 2.5.2
* updating dependencies

# 2.5.1
* change the error type when an unexpected error occurs. (string -> object)

# 2.5.0
* add j&t express

# 2.4.5
* fixed an issue in UPS is not working.

# 2.4.4
* fixed an issue in CJKOREAEXPRESS is not working.

# 2.4.3
* fixed an issue of UPS that always marked as InTransit

# 2.4.2
* update eparcel check point area

# 2.4.1
* disable strictSSL for CJ

# 2.4.0
* added courier LBC

# 2.3.11
* sicepat: add 'rejectUnauthorized' option to ignore ssl error.

# 2.3.10
* sicepat: updated the changed date time format.

# 2.3.9
* kerrythai: changed tracking endpoint

# 2.3.8
* sicepat: apply updated return value

# 2.3.7
* sicepat: fixed delivery status check issue.

# 2.3.6
* eparcel: fixed delivery status check issue and change test dummy data.

# 2.3.5
* eparcel: fixed delivery status check issue.

# 2.3.4
* sicepat: add status for INFO_RECEIVED

# 2.3.3
* sicepat: add apikey for option

# 2.3.2
* sicepat: change to work without apikey

# 2.3.1
* fit to standard format

# 2.3.0
* add eparcel express
* fixed ups tracker

# 2.2.3
* update xpost api endpoint

# 2.2.0
* add xio express

# 2.1.3
# 2.1.2
* add handle for sicepat unknown error.

# 2.1.1
* update sicepat error.

# 2.1.0
* add sicepat.

# 2.0.4
* add error auspost

# 2.0.3
* add message cesco tracking information.

# 2.0.2
* change cesco host

# 2.0.1
* change cesco host (disable ssl)

# 2.0.0
* add KERRY THAI

# 1.9.1
* fixed XPOST pending state. (for pickup)

# 1.9.0
* add XPOST.

# 1.8.0
* add CESCO.

# 1.7.2
* fixed PANTOS not exist tracking number.

# 1.7.1
* fixed UPS time format bug

# 1.7.0
* add TNT.

# 1.6.3
* fixed UPS time format bug

# 1.6.2
* update UPS time format

# 1.6.1
* sort UPS checkpoints.

# 1.6.0
* add UPS.

# 1.5.5
* update cj korea express.
* fixed can not load external courier (pantos)

# 1.5.4
* add exception courier error message.

# 1.5.3
* add external courier to pantos.

# 1.5.2
* add exception courier error message.

# 1.5.1
* fixed can not load pantos data.

# 1.5.0
* add Air Bridge.

# 1.4.4
* update USPS site changes.

# 1.4.3
* update CJ Korea Express timezone.

# 1.4.2
* update yello express, rincos delivery message

# 1.4.0
* add EFS.

# 1.3.1
* update yello express state

# 1.3.0
* add Yello Express.

# 1.2.1
* add POS Laju delivery complete message type.

# 1.2.0
* add POS Laju.

# 1.1.0
* update rincos pending status.

# 1.0.0
* add CJ Korea Express.

# 0.9.4
* Added exception logic for unaligned shipping information.

# 0.9.3
* add a status value to the rincos checkpoint message information.

# 0.9.2
* Added USPS description text to README.md.

# 0.9.1
* Added rincos delivery complete message type.

# 0.9.0
* added USPS.

# 0.8.5
* fixed timeout pantos.

# 0.8.4
* update pantos shiment error handle.

# 0.8.0
* add royalmail.

# 0.7.3
* add koreapost shipping completion condition.

# 0.7.2
* checking the style of all javascript files.

# 0.7.1
* added exception logic when wrong number is entered. (rincos)

# 0.7.0
* add rincos.

# 0.6.1
* add courier to commander

# 0.6.0
* add exception logic when one package is shipped via multiple carriers. (Pantos)
* update test logic.

# 0.5.0
* add australia post.
* add pantos.

# 0.4.1
* add a status value to the fedex checkpoint message information.
* change the delimiter of checkpoint message.

# 0.4.0
* add command line.

# 0.3.0
* add fedex.

# 0.2.0
* add ecargo.

# 0.1.0
* add korea post.
