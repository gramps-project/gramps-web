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

  it('uses year format for Jan 1', () => {
    expect(tickLabel(new Date(2020, 0, 1), formatters)).toBe('year')
    expect(tickLabel(new Date(1066, 0, 1), formatters)).toBe('year')
  })

  it('uses month format for the 1st of any non-January month', () => {
    expect(tickLabel(new Date(2020, 5, 1), formatters)).toBe('month')
    expect(tickLabel(new Date(2020, 11, 1), formatters)).toBe('month')
  })

  it('uses day format for any non-1st day', () => {
    expect(tickLabel(new Date(2020, 5, 15), formatters)).toBe('day')
    expect(tickLabel(new Date(2020, 0, 15), formatters)).toBe('day')
  })
})
