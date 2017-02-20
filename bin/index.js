#! /usr/bin/env node

var program = require('commander')
var tracker = require('../')

program
  .arguments('<tracecode>')
  .option('-c, --courier <courier>', 'Courier Namespace', /^(KOREAPOST|ECARGO|FEDEX|PANTOS|RINCOS|AUSPOST|ROYALMAIL)$/i)
  .action(function (tracecode) {
    if (!tracker.COURIER[program.courier]) {
      console.error('The Company is not supported.')
      process.exit(1)
    } else if (!tracecode) {
      console.error('Please enter a tracecode.')
      process.exit(1)
    }

    var courier = tracker.courier(tracker.COURIER[program.courier].CODE)
    courier.trace(tracecode, function (err, result) {
      if (err) {
        console.error(err)
        process.exit(1)
      }

      console.log(JSON.stringify(result, null, 2))
      process.exit(0)
    })
  })
  .parse(process.argv)
