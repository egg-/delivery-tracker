import type { CheerioAPI } from 'cheerio/slim'
import { load } from 'cheerio/slim'

export type { CheerioAPI }
// `cheerio/slim` keeps the htmlparser2 backend. The default cheerio build parses with
// parse5, which injects <tbody> into tables and breaks the `table > tr` selectors these
// scrapers rely on.
export { load }

/** cheerio's `.val()` can hand back an array; scrapers always want the single value. */
export function inputValue($: CheerioAPI, selector: string): string {
  const value = $(selector).val()
  return typeof value === 'string' ? value : ''
}
