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

```sh
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

### Command Line

```sh
$ npm install -g delivery-tracker
$ delivery-tracker -h

Usage: index [options] <tracecode>

  Options:

    -h, --help               output usage information
    -c, --courier <courier>  Courier Namespace

$ delivery-tracker -c EMS EBXXXXXXXXXKR
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
FEDEX | fedex | FedEx

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
