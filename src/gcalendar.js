/**
 * Calendar SDN (Serial Day Number) conversion functions.
 *
 * Direct port of gramps/gen/lib/gcalendar.py for the five "simple" calendars:
 * Gregorian, Julian, French Republican, Islamic, and Swedish.
 *
 * The SDN is identical to the Julian Day Number (JDN). All functions accept
 * and return integer values. Year numbering uses astronomical convention:
 * year 0 = 1 BC, year -1 = 2 BC, etc.
 *
 * Note: the Hebrew and Persian calendars require more complex helper functions
 * and are not included here.
 */

// ── Gregorian ────────────────────────────────────────────────────────────────

const _GRG_SDN_OFFSET = 32045
const _GRG_DAYS_PER_5_MONTHS = 153
const _GRG_DAYS_PER_4_YEARS = 1461
const _GRG_DAYS_PER_400_YEARS = 146097

/** Convert a Gregorian (year, month, day) to an SDN. */
export function gregorianSdn(year, month, day) {
  let y = year < 0 ? year + 4801 : year + 4800
  let m = month
  if (m > 2) {
    m -= 3
  } else {
    m += 9
    y -= 1
  }
  return (
    Math.floor((Math.floor(y / 100) * _GRG_DAYS_PER_400_YEARS) / 4) +
    Math.floor(((y % 100) * _GRG_DAYS_PER_4_YEARS) / 4) +
    Math.floor((m * _GRG_DAYS_PER_5_MONTHS + 2) / 5) +
    day -
    _GRG_SDN_OFFSET
  )
}

/** Convert an SDN to a Gregorian (year, month, day). */
export function gregorianYmd(sdn) {
  let temp = (_GRG_SDN_OFFSET + sdn) * 4 - 1
  const century = Math.floor(temp / _GRG_DAYS_PER_400_YEARS)
  temp = Math.floor((temp % _GRG_DAYS_PER_400_YEARS) / 4) * 4 + 3
  let year = century * 100 + Math.floor(temp / _GRG_DAYS_PER_4_YEARS)
  const dayOfYear = Math.floor((temp % _GRG_DAYS_PER_4_YEARS) / 4) + 1
  temp = dayOfYear * 5 - 3
  let month = Math.floor(temp / _GRG_DAYS_PER_5_MONTHS)
  const day = Math.floor((temp % _GRG_DAYS_PER_5_MONTHS) / 5) + 1
  if (month < 10) {
    month += 3
  } else {
    year += 1
    month -= 9
  }
  year -= 4800
  if (year <= 0) year -= 1 // year 0 is not a valid Gramps year; dateval year 0 means "unspecified". 1 BC = year -1.
  return [year, month, day]
}

// ── Julian ───────────────────────────────────────────────────────────────────

const _JLN_SDN_OFFSET = 32083
const _JLN_DAYS_PER_5_MONTHS = 153
const _JLN_DAYS_PER_4_YEARS = 1461

/** Convert a Julian calendar (year, month, day) to an SDN. */
export function julianSdn(year, month, day) {
  let y = year < 0 ? year + 4801 : year + 4800
  let m = month
  if (m > 2) {
    m -= 3
  } else {
    m += 9
    y -= 1
  }
  return (
    Math.floor((y * _JLN_DAYS_PER_4_YEARS) / 4) +
    Math.floor((m * _JLN_DAYS_PER_5_MONTHS + 2) / 5) +
    day -
    _JLN_SDN_OFFSET
  )
}

/** Convert an SDN to a Julian calendar (year, month, day). */
export function julianYmd(sdn) {
  let temp = (sdn + _JLN_SDN_OFFSET) * 4 - 1
  let year = Math.floor(temp / _JLN_DAYS_PER_4_YEARS)
  const dayOfYear = Math.floor((temp % _JLN_DAYS_PER_4_YEARS) / 4) + 1
  temp = dayOfYear * 5 - 3
  let month = Math.floor(temp / _JLN_DAYS_PER_5_MONTHS)
  const day = Math.floor((temp % _JLN_DAYS_PER_5_MONTHS) / 5) + 1
  if (month < 10) {
    month += 3
  } else {
    year += 1
    month -= 9
  }
  year -= 4800
  if (year <= 0) year -= 1
  return [year, month, day]
}

// ── French Republican ─────────────────────────────────────────────────────────

const _FR_SDN_OFFSET = 2375474
const _FR_DAYS_PER_4_YEARS = 1461
const _FR_DAYS_PER_MONTH = 30

/** Convert a French Republican Calendar (year, month, day) to an SDN. */
export function frenchSdn(year, month, day) {
  return (
    Math.floor((year * _FR_DAYS_PER_4_YEARS) / 4) +
    (month - 1) * _FR_DAYS_PER_MONTH +
    day +
    _FR_SDN_OFFSET
  )
}

/** Convert an SDN to a French Republican Calendar (year, month, day). */
export function frenchYmd(sdn) {
  const temp = (sdn - _FR_SDN_OFFSET) * 4 - 1
  const year = Math.floor(temp / _FR_DAYS_PER_4_YEARS)
  const dayOfYear = Math.floor((temp % _FR_DAYS_PER_4_YEARS) / 4)
  const month = Math.floor(dayOfYear / _FR_DAYS_PER_MONTH) + 1
  const day = (dayOfYear % _FR_DAYS_PER_MONTH) + 1
  return [year, month, day]
}

// ── Islamic ───────────────────────────────────────────────────────────────────

const _ISM_EPOCH = 1948439.5

/** Convert an Islamic calendar (year, month, day) to an SDN. */
export function islamicSdn(year, month, day) {
  return Math.ceil(
    day +
      Math.ceil(29.5 * (month - 1)) +
      (year - 1) * 354 +
      Math.floor((3 + 11 * year) / 30) +
      _ISM_EPOCH -
      1
  )
}

/** Convert an SDN to an Islamic calendar (year, month, day). */
export function islamicYmd(sdn) {
  const s = Math.floor(sdn) + 0.5
  const year = Math.floor((30 * (s - _ISM_EPOCH) + 10646) / 10631)
  const month = Math.min(
    12,
    Math.ceil((s - (29 + islamicSdn(year, 1, 1))) / 29.5) + 1
  )
  const day = Math.floor(s - islamicSdn(year, month, 1)) + 1
  return [year, month, day]
}

// ── Swedish ───────────────────────────────────────────────────────────────────

/**
 * Convert a Swedish calendar (year, month, day) to an SDN.
 *
 * The Swedish calendar was Julian minus 1 day from 1700-03-01 through
 * 1712-02-29 (a unique leap day), then Julian again until 1753-02-28,
 * and Gregorian from 1753-03-01 onwards.
 */
function dateCmp(a, b) {
  if (a[0] !== b[0]) return a[0] - b[0]
  if (a[1] !== b[1]) return a[1] - b[1]
  return a[2] - b[2]
}

export function swedishSdn(year, month, day) {
  const d = [year, month, day]
  if (dateCmp(d, [1700, 3, 1]) >= 0 && dateCmp(d, [1712, 2, 30]) <= 0)
    return julianSdn(year, month, day) - 1
  if (dateCmp(d, [1753, 3, 1]) >= 0) return gregorianSdn(year, month, day)
  return julianSdn(year, month, day)
}

/** Convert an SDN to a Swedish calendar (year, month, day). */
export function swedishYmd(sdn) {
  if (sdn === 2346425) return [1712, 2, 30] // unique Swedish leap day
  if (sdn >= 2342042 && sdn < 2346425) return julianYmd(sdn + 1)
  if (sdn >= 2361390) return gregorianYmd(sdn)
  return julianYmd(sdn)
}

// ── Calendar index (matches Gramps Date.CAL_* constants) ─────────────────────

export const CALENDARS = {
  GREGORIAN: 0,
  JULIAN: 1,
  HEBREW: 2, // not implemented here
  FRENCH: 3,
  PERSIAN: 4, // not implemented here
  ISLAMIC: 5,
  SWEDISH: 6,
}

/** Convert any supported calendar date to an SDN. Zero-adjusts partial dates. */
export function dateToSdn(calendar, year, month, day) {
  if (year === 0 && month === 0 && day === 0) return 0
  const y = year !== 0 ? year : 1
  const m = month > 0 ? month : 1
  const d = day > 0 ? day : 1
  switch (calendar) {
    case CALENDARS.GREGORIAN:
      return gregorianSdn(y, m, d)
    case CALENDARS.JULIAN:
      return julianSdn(y, m, d)
    case CALENDARS.FRENCH:
      return frenchSdn(y, m, d)
    case CALENDARS.ISLAMIC:
      return islamicSdn(y, m, d)
    case CALENDARS.SWEDISH:
      return swedishSdn(y, m, d)
    default:
      throw new Error(`Calendar ${calendar} not implemented in JS`)
  }
}
