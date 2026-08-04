import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import utc from 'dayjs/plugin/utc.js'

// Couriers only need these two: `.utc()` and explicit `dayjs(str, 'FMT')` parsing.
dayjs.extend(utc)
dayjs.extend(customParseFormat)

export default dayjs
