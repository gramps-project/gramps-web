import {describe, it, expect} from 'vitest'
import {_ageAtDeath} from '../../src/views/GrampsjsViewPeople.js'

describe('_ageAtDeath', () => {
  it('counts completed years when both dates are full', () => {
    expect(_ageAtDeath('1819-05-24', '1901-01-22')).toBe(81)
    expect(_ageAtDeath('1777-12-23', '1825-12-01')).toBe(47)
    expect(_ageAtDeath('1926-04-21', '2022-09-08')).toBe(96)
    expect(_ageAtDeath('1900-03-01', '1950-03-01')).toBe(50)
  })

  it('falls back to the years when a date is not complete', () => {
    expect(_ageAtDeath('1819', '1901-01-22')).toBe(82)
    expect(_ageAtDeath('abt 1819-05-24', 'bef 1901')).toBe(82)
  })

  it('returns null without both dates', () => {
    expect(_ageAtDeath('', '1901-01-22')).toBe(null)
    expect(_ageAtDeath('1901-01-22', '1819-05-24')).toBe(null)
  })
})
