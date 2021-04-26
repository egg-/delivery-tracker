'use strict'

var request = require('request')
var moment = require('moment')

var tracker = require('../')

const loadHandler = function(opts) {
    return {
        trackingInfo: function (number) {
            return {
                method: 'GET',
                url: 'https://api-eu.dhl.com/track/shipments?trackingNumber=' + number,
                json: true,
                headers: {
                    'DHL-API-Key': opts.apikey
                }
            }
        },
        parser: {
            trace: function (data) {
                var courier = {
                    code: tracker.COURIER.DHL.CODE,
                    name: tracker.COURIER.DHL.NAME
                }

                var result = {
                    courier: courier,
                    number: data.id,
                    status: tracker.STATUS.PENDING
                }

                var checkpoints = []
                for (var i = 0; i < data.events.length; i++) {
                    var item = data.events[i]
                    var checkpoint = {
                        courier: courier,
                        message: item.description,
                        status: tracker.STATUS.IN_TRANSIT,
                        time: moment(item.timestamp).utc().format('YYYY-MM-DDTHH:mmZ')
                    }

                    let location = item.location && item.location.address && item.location.address.addressLocality;

                    if (location) {
                        checkpoint.location = location;
                    }

                    if (item.statusCode === 'delivered') {
                        checkpoint.status = tracker.STATUS.DELIVERED
                    } else if (item.statusCode === 'returned') {
                        checkpoint.status = tracker.STATUS.RETURNED
                    }
                    checkpoints.push(checkpoint)
                }

                result.checkpoints = checkpoints
                result.status = tracker.normalizeStatus(result.checkpoints)

                return result
            }
        }
    }
};


module.exports = function (opts = {}) {
    let handler = loadHandler(opts);
    return {
        trackingInfo: handler.trackingInfo,
        trace: function (number, cb) {
            if (!opts.apikey) {
                return cb(null,tracker.error(tracker.ERROR.REQUIRED_APIKEY));
            }

            var tracking = handler.trackingInfo(number, opts.consumerKey, cb)
            request(tracking, function (err, res, body) {
                if (err) {
                    return cb(err)
                }

                try {
                    if (res.statusCode !== 200) {
                        return cb(tracker.error(res.statusMessage))
                    }

                    var result = handler.parser.trace(body.shipments[0])
                    cb(result ? null : tracker.error(tracker.ERROR.INVALID_NUMBER), result)
                } catch (e) {
                    cb(tracker.error(e.message))
                }
            })
        }
    }
}