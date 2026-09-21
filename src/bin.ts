#!/usr/bin/env node
import { program } from 'commander'
import { COURIER, type CourierKey, courier, TrackerError } from './index.js'

interface Options {
  courier?: string
  apikey?: string
}

program
  .name('delivery-tracker')
  .argument('<tracecode>')
  .option('-c, --courier <courier>', 'Courier Namespace')
  .option('-k, --apikey <apikey>', 'API KEY')
  .action(async (tracecode: string, options: Options) => {
    const meta = COURIER[(options.courier ?? '').toUpperCase() as CourierKey]
    if (!meta) {
      console.error('The Company is not supported.')
      process.exit(1)
    }

    try {
      const client = courier(meta.CODE, options.apikey ? { apikey: options.apikey } : undefined)
      console.log(JSON.stringify(await client.trace(tracecode), null, 2))
    } catch (err) {
      // A courier rejecting a number is an ordinary outcome, not a crash: print the
      // code and the message, and keep the stack for the unexpected ones.
      console.error(err instanceof TrackerError ? `${err.message} (code ${err.code})` : err)
      process.exit(1)
    }
  })

await program.parseAsync(process.argv)
