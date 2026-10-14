import {describe, it, expect} from 'vitest'
import {formatRateLimit} from '../../src/util.js'

describe('formatRateLimit', () => {
  it('formats a single unit window without a count', () => {
    expect(formatRateLimit([{amount: 1, window_seconds: 86400}])).toBe('1/day')
  })

  it('formats multi-unit windows in the largest whole unit', () => {
    expect(
      formatRateLimit([
        {amount: 100, window_seconds: 7200},
        {amount: 5, window_seconds: 90},
      ])
    ).toBe('100/2 hours, 5/90 seconds')
  })

  it('localizes with an underscore locale', () => {
    expect(formatRateLimit([{amount: 1, window_seconds: 3600}], 'de_DE')).toBe(
      '1/Stunde'
    )
  })

  it('returns an empty string for missing or invalid limits', () => {
    expect(formatRateLimit(undefined)).toBe('')
    expect(formatRateLimit([{amount: 1, window_seconds: 0}])).toBe('')
  })
})
