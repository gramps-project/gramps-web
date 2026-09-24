/*
Date utility functions
*/

// eslint-disable-next-line class-methods-use-this
export function toDate(dateVal) {
  try {
    return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
  } catch {
    return ''
  }
}

// Reformat a date string in the user's locale. Returns the input unchanged
// when it is not an ISO-shaped date (YYYY-MM-DD, YYYY-MM, YYYY), so that
// ranges ("1899 - 1900"), modifiers ("before 1899") or already-localized
// strings pass through untouched. Trims whitespace before matching.
//
// This shields the UI from backends that ignore the `?locale=` parameter
// when serializing dates.
export function formatDate(dateStr, locale) {
  if (dateStr === undefined || dateStr === null) {
    return ''
  }
  const trimmed = String(dateStr).trim()
  if (trimmed === '') {
    return ''
  }
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(trimmed)
  if (!m) {
    return dateStr
  }
  const [, y, mo, d] = m
  const options = {year: 'numeric'}
  if (mo !== undefined) options.month = '2-digit'
  if (d !== undefined) options.day = '2-digit'
  try {
    // Construct in local time so year/month/day match the input — the ISO
    // parser would treat it as UTC and could shift by a day in negative-offset
    // timezones.
    const jsDate = new Date(
      Number(y),
      mo !== undefined ? Number(mo) - 1 : 0,
      d !== undefined ? Number(d) : 1
    )
    // Intl.DateTimeFormat expects a BCP 47 locale (de-AT), but our i18n.lang
    // is stored with underscores (de_AT). Normalize defensively so call
    // sites don't have to remember.
    const intlLocale = (locale || 'en').replace(/_/g, '-')
    return new Intl.DateTimeFormat(intlLocale, options).format(jsDate)
  } catch {
    return dateStr
  }
}
