import {describe, it, expect} from 'vitest'
import {
  VERIFY_OPTIONS_DEFAULTS,
  verifyOptionsFromSettings,
  verifyOptionsToSettings,
} from '../../src/verifyOptions.js'

describe('verifyOptionsFromSettings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(verifyOptionsFromSettings(undefined)).toEqual(
      VERIFY_OPTIONS_DEFAULTS
    )
    expect(verifyOptionsFromSettings(null)).toEqual(VERIFY_OPTIONS_DEFAULTS)
    expect(verifyOptionsFromSettings({})).toEqual(VERIFY_OPTIONS_DEFAULTS)
  })

  it('applies stored values over the defaults', () => {
    const options = verifyOptionsFromSettings({oldage: 110, invdate: false})
    expect(options.oldage).toBe(110)
    expect(options.invdate).toBe(false)
    expect(options.hwdif).toBe(VERIFY_OPTIONS_DEFAULTS.hwdif)
  })

  it('ignores unknown keys and values of the wrong type', () => {
    // As parsed from localStorage
    const stored = JSON.parse(
      '{"unknown": 5, "oldage": "110", "hwdif": 2.5, "cspace": null,' +
        ' "estimate_age": 1, "__proto__": {"wedder": 9}}'
    )
    const options = verifyOptionsFromSettings(stored)
    expect(options).toEqual(VERIFY_OPTIONS_DEFAULTS)
    expect(Object.getPrototypeOf(options)).toBe(Object.prototype)
  })

  it('ignores a stored value that is not an object', () => {
    expect(verifyOptionsFromSettings('oldage=110')).toEqual(
      VERIFY_OPTIONS_DEFAULTS
    )
  })

  it('does not change the defaults', () => {
    const options = verifyOptionsFromSettings({oldage: 110})
    options.hwdif = 40
    expect(VERIFY_OPTIONS_DEFAULTS.oldage).toBe(90)
    expect(VERIFY_OPTIONS_DEFAULTS.hwdif).toBe(30)
  })
})

describe('verifyOptionsToSettings', () => {
  it('stores nothing for the defaults', () => {
    expect(verifyOptionsToSettings({...VERIFY_OPTIONS_DEFAULTS})).toEqual({})
  })

  it('stores only the values that differ from the defaults', () => {
    expect(
      verifyOptionsToSettings({
        ...VERIFY_OPTIONS_DEFAULTS,
        oldage: 110,
        estimate_age: true,
      })
    ).toEqual({oldage: 110, estimate_age: true})
  })

  it('drops a value that is set back to its default', () => {
    const stored = verifyOptionsToSettings({
      ...VERIFY_OPTIONS_DEFAULTS,
      oldage: 110,
    })
    const reverted = verifyOptionsToSettings({
      ...verifyOptionsFromSettings(stored),
      oldage: VERIFY_OPTIONS_DEFAULTS.oldage,
    })
    expect(reverted).toEqual({})
  })

  it('round-trips through the settings', () => {
    const options = {...VERIFY_OPTIONS_DEFAULTS, yngmar: 16, invdate: false}
    expect(verifyOptionsFromSettings(verifyOptionsToSettings(options))).toEqual(
      options
    )
  })
})
