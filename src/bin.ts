#!/usr/bin/env node
import { program } from 'commander'
import { COURIER, type CourierKey, courier } from './index.js'

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
      console.error(err)
      process.exit(1)
    }
  })

await program.parseAsync(process.argv)
