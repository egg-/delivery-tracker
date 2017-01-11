# delivery-tracker

[![version](https://img.shields.io/npm/v/delivery-tracker.svg) ![download](https://img.shields.io/npm/dm/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker) [![status status](https://travis-ci.org/egg-/delivery-tracker.svg?branch=master)](https://travis-ci.org/egg-/delivery-tracker)

delivery-tracker is delivery tracking library for Node.js

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)


## Courier List

Name | Contributor | Link
---- | ---- | ----
Korea Post | @egg- | https://trace.epost.go.kr//xtts/tt/epost/ems/ems_eng.jsp
Ecargo | @egg- | http://web.ecargo.asia/script/users/tracking.php
FedEx | @egg- | https://www.fedex.com/apps/fedextrack/?action=track

## Installation

```
$ npm install delivery-tracker
```

## Usage

```javascript
var tracker = require('delivery-tracker')
var courier = tracker.courier(tracker.COURIER.KOREAPOST.CODE)

courier.trace({trace_number}, function (err, result) {
  console.log(result)
})
```

## Response

Attribute | Type | Description
---- | ---- | ----
courier | Courier Object | courier information
number | String | tracking number
status | String | delivery status
checkpoints | Array of Checkpoint Object | Array of the checkpoint information.

### Courier Object

Attribute | Type | Description
---- | ---- | ----
code | String | Unique code of courier.
name | String | Courier name

### Checkpoint Object

Attribute | Type | Description
---- | ---- | ----
courier | Courier Object | courier information
location | String | Location info of the checkpoint provided by the courier.
message | String | Checkpoint message
time | String | The date and time of the checkpoint provided by the courier. The values can be:<br>Empty string,<br> YYYY-MM-DD,<br> YYYY-MM-DDTHH:mm:ss <br> YYYY-MM-DDTHH:mm:ss+Timezone


## CODE

### COURIER

`tracker.COURIER.{NAMESPACE}`

NAMESPACE | CODE | NAME
---- | ---- | ----
KOREAPOST | koreapost | Korea Post
ECARGO | ecargo | Ecargo

### STATUS

`tracker.STATUS.{CODE}`

Code | Value | Description
---- | ---- | ----
INFO_RECEIVED | InfoReceived | The carrier received a request from the shipper and wants to start shipping.
PENDING | Pending | New pending shipment to track or a new shipment without tracking information added.
IN_TRANSIT | InTransit | The carrier has received or received the carrier. Shipment is in progress.
DELIVERED | Delivered | The shipment was successfully delivered.
EXCEPTION | Exception | Custom hold, undeliverable, shipper has shipped or shipped an exception.
FAIL_ATTEMPT | FailAttempt | The courier tried to send but failed, but usually reminds and tries again.

### ERROR

`tracker.STATUS.{CODE}`

Code | Value | Description
---- | ---- | ----
UNKNOWN | -1 | Unknow error
INVALID_NUMBER | 10 | invalid trace number.
INVALID_NUMBER_LENGTH | 11 | invalid trace number.
INVALID_NUMBER_HEADER | 12 | invalid trace number.
INVALID_NUMBER_COUNTRY | 13 | invalid trace number.

### Sample

```javascript
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
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "MYKULA",
      "message": "Departure from inward office of exchange",
      "time": "2016-07-03T00:49:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "MYKULA",
      "message": "",
      "time": "2016-07-02T22:46:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "MYKULA",
      "message": "Arrival at inward office of exchange",
      "time": "2016-07-02T22:45:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "KUALALUMPUR",
      "message": "Delivered to Destination Airport",
      "time": "2016-07-01T23:02:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "KUALALUMPUR",
      "message": "Airrival at Destination Airport",
      "time": "2016-07-01T21:52:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "INCHEON",
      "message": "Departure from Airport",
      "time": "2016-07-01T16:44:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "INCHEON",
      "message": "Received by Air carrier",
      "time": "2016-07-01T14:05:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "INCHEON",
      "message": "\nFlight number : KE671",
      "time": "2016-06-30T16:48:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "INTERNATIONAL POST OFFICE",
      "message": "Departure from outward office of exchange\nDispatch number : 401",
      "time": "2016-06-30T15:01:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "INTERNATIONAL POST OFFICE",
      "message": "",
      "time": "2016-06-30T14:32:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "SL. KANGNAM",
      "message": "",
      "time": "2016-06-30T13:30:00"
    },
    {
      "courier": {
        "code": "koreapost",
        "name": "Korea Post"
      },
      "location": "SL. KANGNAM",
      "message": "Posting/Collection\nPosting office zip code : 06336\nTransit or Destination country : MALAYSIA",
      "time": "2016-06-30T11:36:00"
    }
  ]
}
```

## Test

Test with mocha

```bash
$ grunt
```

like watch

```bash
$ grunt watch
```

## Contributing

Bug reports and pull requests are welcome on Github at [https://github.com/egg-/delivery-tracker](https://github.com/egg-/delivery-tracker)

1. Fort it
1. Create your feature branch.
1. Commit your changes.
1. Push to the branch.
1. Create a new Pull Request.

## Release History

See the [CHANGELOG.md](CHANGELOG.md)

## License

delivery-tracker is licensed under the [MIT license](https://github.com/egg-/delivery-tracker/blob/master/LICENSE).
