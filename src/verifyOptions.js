/*
Options of the "Verify the Data" tool. Values that differ from the defaults
are kept in the settings, so they persist between runs.
*/

export const VERIFY_OPTIONS_DEFAULTS = {
  oldage: 90,
  hwdif: 30,
  cspace: 8,
  cbspan: 25,
  yngmar: 17,
  oldmar: 50,
  oldmom: 48,
  yngmom: 17,
  yngdad: 18,
  olddad: 65,
  wedder: 3,
  mxchildmom: 12,
  mxchilddad: 15,
  lngwdw: 30,
  oldunm: 99,
  estimate_age: false,
  invdate: true,
}

function isValidOption(key, value) {
  if (!Object.hasOwn(VERIFY_OPTIONS_DEFAULTS, key)) {
    return false
  }
  if (typeof VERIFY_OPTIONS_DEFAULTS[key] === 'boolean') {
    return typeof value === 'boolean'
  }
  return Number.isInteger(value)
}

// The options to use: the defaults, overridden by the stored values.
// Unknown keys and values of the wrong type are ignored.
export function verifyOptionsFromSettings(stored) {
  const options = {...VERIFY_OPTIONS_DEFAULTS}
  if (stored && typeof stored === 'object') {
    for (const [key, value] of Object.entries(stored)) {
      if (isValidOption(key, value)) {
        options[key] = value
      }
    }
  }
  return options
}

// The values to store: only those that differ from the defaults, so that a
// later change of a default still applies to the options left unchanged.
export function verifyOptionsToSettings(options) {
  return Object.fromEntries(
    Object.entries(options).filter(
      ([key, value]) =>
        isValidOption(key, value) && value !== VERIFY_OPTIONS_DEFAULTS[key]
    )
  )
}
