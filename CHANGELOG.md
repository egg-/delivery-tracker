# 3.0.0

Rewritten in TypeScript. This release is **breaking** — see the migration notes below.

## Breaking
* **ESM only.** `require('delivery-tracker')` no longer works; use `import`.
* **`trace()` returns a promise** instead of taking a callback.
  * `courier.trace(number, cb)` → `await courier.trace(number)`
  * Failures now **reject** with a `TrackerError` (an `Error` subclass with `.code`),
    where v2 passed a plain `{ code, message }` object to the callback.
* **Requires Node.js 20 or later.**
* `COURIER.DEPPON` removed — it had no implementation and threw on use.
* **Five couriers removed** because their hostname no longer resolves, so they cannot
  work regardless of the parser: `ecargo`, `yelloexpress`, `kerrythai`, `xioexpress`,
  `airbridge`. Their tests passed only because `nock` replayed recordings made in
  2017–2020. The parsers and fixtures remain in git history.
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
* Corrected date formats that v2 got wrong. `moment` accepted them leniently and produced
  plausible but incorrect timestamps; these are now parsed properly.
  * `usps` — the page writes `March 16, 2024,1:55 pm` (no space after the second comma),
    `March 7, 2024,9:15 pm` (unpadded day) and `March 13, 2024` (no time). v2 silently
    dropped the time and reported every checkpoint at `00:00`.
  * `royalmail` — the cells read `18/01/17` + `23:53`, but the format string said
    `DD-MMM-YYYYHH:mm`. v2 read that as `2001-01-18T17:53`; it is `2017-01-18T23:53`.
  * `cesco` — Indonesian month names are expanded to full English names, so the format
    needs `MMMM` rather than `MMM`.
* `ups` — UPS reports a 12-hour clock as `10:53 P.M.`, but the format string read it as
  `HH:mm`, so every afternoon event was recorded twelve hours early. Reported in #35 by
  @aldin-alagic, whose fix could not be merged once the sources moved to `src/`.
* `usps` — whitespace inside the date cell is collapsed before parsing, so runs of spaces
  no longer break it. Also from #35.
* Added a sweep test asserting every courier's checkpoints carry a parseable timestamp —
  the per-courier tests only ever checked `number` and `status`. Timestamps that parse but
  land on the wrong hour are now asserted explicitly for the couriers above.

## Notes
* Added a "Reporting a broken courier" guide to the README and a matching GitHub issue
  form. A report needs either a tracking number or a recorded response to be actionable;
  since a tracking number resolves to an address, times and often a recipient name, the
  guide offers the recorded response as an equal alternative and explains how to capture
  and redact one.
* Documented courier status in the README. Beyond the five removed above, an endpoint
  probe on 2026-08-05 found ten couriers whose endpoint has moved or is blocked; they are
  marked **broken** in the courier table and left in place, since the fix is to re-record
  a fixture rather than to delete the parser. A passing build has never meant a courier
  works — the tests only replay recordings. This is a pre-existing gap, not a regression
  introduced by this release.

## Changed
* Source moved to `src/`, published output is built to `dist/`.
* `paxel` now really subtracts a year from timestamps parsed ahead of the current date —
  the v2 code called `.subtract()` without using its result.
* Couriers no longer index into a shared registry to reach each other; `pantos` and
  `airbridge` import the couriers they hand off to directly.

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
