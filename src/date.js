/*
Date utility functions
*/

export const DATE_FORMAT_API_MIN_VERSION = [3, 26, 0]

export const DATE_FORMAT_OPTIONS = [
  {format: 0, label: 'YYYY-MM-DD (ISO)'},
  {format: 1, label: 'Numerical'},
  {format: 2, label: 'Month Day, Year'},
  {format: 3, label: 'Mon Day, Year'},
  {format: 4, label: 'Day Month Year'},
  {format: 5, label: 'Day Mon Year'},
  {format: 6, label: 'Numerisch mit führenden Nullen', language: 'de'},
]

export function supportsDateFormat(format, lang = '') {
  if (!Number.isInteger(format) || format < 0) {
    return false
  }
  const option = DATE_FORMAT_OPTIONS.find(item => item.format === format)
  return Boolean(
    option &&
      (!option.language ||
        new RegExp(`^${option.language}(?:[_-]|$)`).test(lang))
  )
}

// eslint-disable-next-line class-methods-use-this
export function toDate(dateVal) {
  try {
    return `${dateVal[2]}-${dateVal[1]}-${dateVal[0]}`
  } catch {
    return ''
  }
}

export function getDateFormat(settings = {}) {
  if ('dateFormat' in settings) {
    return supportsDateFormat(settings.dateFormat, settings.lang)
      ? settings.dateFormat
      : null
  }
  return /^de(?:[_-]|$)/.test(settings.lang || '') ? 6 : null
}

export function withDateFormat(endpoint, dateFormat, lang) {
  const [path] = endpoint.split('?')
  const objectEndpoint =
    path !== '/api/places/coordinates/' &&
    /^\/api\/(?:people|families|events|places|sources|citations|repositories|notes|media)\/?(?:[^/?]+)?\/?$/.test(
      path
    )
  const dateEndpoint =
    objectEndpoint ||
    path === '/api/search/' ||
    /^\/api\/people\/(?:[^/]+\/)?timeline$/.test(path) ||
    /^\/api\/families\/[^/]+\/timeline$/.test(path) ||
    /^\/api\/people\/[^/]+\/alive\/dates$/.test(path)

  if (!dateEndpoint) {
    return endpoint
  }

  const additions = []
  if (lang && !/[?&]locale=/.test(endpoint)) {
    additions.push(`locale=${encodeURIComponent(lang)}`)
  }
  if (
    Number.isInteger(dateFormat) &&
    dateFormat >= 0 &&
    !/[?&]date_format=/.test(endpoint)
  ) {
    additions.push(`date_format=${dateFormat}`)
  }
  if (!additions.length) {
    return endpoint
  }
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${additions.join(
    '&'
  )}`
}
