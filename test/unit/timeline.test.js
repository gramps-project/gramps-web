import {describe, it, expect} from 'vitest'
import {
  normalizeLocale,
  initialDomain,
  tickLabel,
} from '../../src/charts/Timeline.js'

describe('normalizeLocale', () => {
  it('converts underscore to hyphen', () => {
    expect(normalizeLocale('de_AT')).toBe('de-AT')
    expect(normalizeLocale('pt_PT')).toBe('pt-PT')
    expect(normalizeLocale('en_GB')).toBe('en-GB')
  })

  it('leaves already-valid locales unchanged', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBe('fr')
  })

  it('falls back to en for falsy values', () => {
    expect(normalizeLocale('')).toBe('en')
    expect(normalizeLocale(null)).toBe('en')
    expect(normalizeLocale(undefined)).toBe('en')
  })
})

describe('initialDomain', () => {
  it('starts on Jan 1st exactly 100 years before now', () => {
    const now = new Date('2026-05-18')
    const [start] = initialDomain(now)
    expect(start.getFullYear()).toBe(1926)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
  })

  it('ends at the supplied date', () => {
    const now = new Date('2026-05-18')
    const [, end] = initialDomain(now)
    expect(end).toBe(now)
  })

  it('works across century boundaries', () => {
    const now = new Date('2000-01-01')
    const [start] = initialDomain(now)
    expect(start.getFullYear()).toBe(1900)
  })
})

describe('tickLabel', () => {
  const fmtDay = {format: () => 'day'}
  const fmtMonth = {format: () => 'month'}
  const fmtYear = {format: () => 'year'}
  const formatters = {fmtDay, fmtMonth, fmtYear}
  const date = new Date('2020-06-15')

  it('uses day format when visibleDays <= 60', () => {
    expect(tickLabel(date, 1, formatters)).toBe('day')
    expect(tickLabel(date, 60, formatters)).toBe('day')
  })

  it('uses month format when visibleDays is between 61 and 3650', () => {
    expect(tickLabel(date, 61, formatters)).toBe('month')
    expect(tickLabel(date, 3650, formatters)).toBe('month')
  })

  it('uses year format when visibleDays > 3650', () => {
    expect(tickLabel(date, 3651, formatters)).toBe('year')
    expect(tickLabel(date, 36500, formatters)).toBe('year')
  })
})
