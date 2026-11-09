import {describe, it, expect} from 'vitest'
import {GrampsjsViewPeople} from '../../src/views/GrampsjsViewPeople.js'

const view = {appState: {i18n: {lang: 'en'}}}
const age = (birth, death, deathAge) =>
  GrampsjsViewPeople.prototype._formatRow.call(view, {
    profile: {birth: {date: birth}, death: {date: death, age: deathAge}},
  }).age

describe('People list age at death', () => {
  it('asks the backend for the age, in years', () => {
    const url = Object.getOwnPropertyDescriptor(
      GrampsjsViewPeople.prototype,
      '_fetchUrl'
    ).get.call(view)
    expect(url).toContain('profile=self,age&precision=1')
  })

  it('shows the age the backend formatted', () => {
    expect(age('1819-05-24', '1901-01-22', '81 years')).toBe('81 years')
    expect(age('1030', 'about 1066', 'about 36 years')).toBe('about 36 years')
  })

  it('stays empty without both dates', () => {
    expect(age('794', '', 'unknown')).toBe('')
    expect(age('', '1098', 'unknown')).toBe('')
  })

  it('stays empty when the backend has no age', () => {
    expect(age('abt. Michaelmas', '1890', 'unknown')).toBe('')
    expect(age('1819-05-24', '1901-01-22', undefined)).toBe('')
  })
})
