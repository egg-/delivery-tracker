# delivery-tracker

[![version](https://img.shields.io/npm/v/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker) [![download](https://img.shields.io/npm/dm/delivery-tracker.svg)](https://www.npmjs.com/package/delivery-tracker)
[![status status](https://travis-ci.org/egg-/delivery-tracker.svg?branch=master)](https://travis-ci.org/egg-/delivery-tracker)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

delivery-tracker is delivery tracking library for Node.js


## Courier List

Name | Contributor | Link
---- | ---- | ----
Korea Post | @egg- | http://www.koreapost.go.kr/
Ecargo | @egg- | http://ecargo.asia/script/users/main.php
FedEx | @egg- | https://www.fedex.com/
Australia Post | @egg- | https://auspost.com.au/
Pantos | @egg- | http://www.epantos.com/
Rincos | @egg- | http://www.rincos.co.kr/
Royal Mail | @egg- | http://www.royalmail.com/
USPS | @egg- | https://www.usps.com/
CJ Korea Express (Korea) | @egg- | http://cjkoreaexpress.co.kr/ (https://www.doortodoor.co.kr)
POS Laju | @egg- | http://www.poslaju.com.my
Yello Express | @egg- | https://www.yello-express.com
EFS | @egg- | http://efs.asia/
UPS | @egg- | https://www.ups.com
TNT | @egg- | https://www.tnt.com
CESCO | @egg- | https://www.cesco-logistics.com/
XPOST | @egg- | https://www.xpost.ph/
KERRYTHAI | @egg- | https://th.kerryexpress.com
SICEPAT | @egg- | http://sicepat.com/
XIOExpress | @egg- | https://xioexpress.com/
eParcel | @egg- | https://eparcel.kr/

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
    -k, --apikey <apikey>  Courier API key

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
AUSPOST | auspost | Australia Post
PANTOS | pantos | Pantos
RINCOS | rincos | Rincos
ROYALMAIL | royalmail | Royal Mail
USPS | usps | USPS
CJKOREAEXPRESS | cjkoreaexpress | CJ Korea Express
POSLAJU | poslaju | POS Laju
YELLOEXPRESS | yelloexpress | Yello Express
EFS | efs | EFS
UPS | ups | UPS
TNT | tnt | TNT
CESCO | cesco | CESCO
XPOST | xpost | XPOST
KERRYTHAI | kerrythai | KERRYTHAI
SICEPAT | sicepat | SICEPAT
XIOEXPRESS | xioexpress | XIOExpress
EPARCEL | eparcel | eParcel

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
NOT_SUPPORT_SHIPMENT | 20 | shipment does not support.
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

1. Fork it
1. Create your feature branch.
1. Commit your changes.
1. Push to the branch.
1. Create a new Pull Request.

## Release History

See the [CHANGELOG.md](CHANGELOG.md)

## License

delivery-tracker is licensed under the [MIT license](https://github.com/egg-/delivery-tracker/blob/master/LICENSE).
