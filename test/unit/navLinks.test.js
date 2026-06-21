import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {normalizeNavLinks} from '../../src/util.js'

describe('normalizeNavLinks', () => {
  let warn

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('applies defaults for a minimal valid link', () => {
    const result = normalizeNavLinks([{title: 'Topola', url: '/topola'}])
    expect(result).toEqual([
      {title: 'Topola', url: '/topola', target: '_self', icon: undefined},
    ])
    expect(warn).not.toHaveBeenCalled()
  })

  it('preserves an explicit target and icon', () => {
    const result = normalizeNavLinks([
      {
        title: 'Manual',
        url: 'https://example.org/manual',
        target: '_blank',
        icon: 'M1',
      },
    ])
    expect(result[0].target).toBe('_blank')
    expect(result[0].icon).toBe('M1')
  })

  it('falls back to _self for a non-string target', () => {
    const result = normalizeNavLinks([{title: 'T', url: '/u', target: 5}])
    expect(result[0].target).toBe('_self')
  })

  it('skips invalid entries, keeps valid ones in order, and warns', () => {
    const result = normalizeNavLinks([
      {title: 'A', url: '/a'},
      {title: '', url: '/b'},
      {url: '/c'},
      {title: 'D'},
      {title: 1, url: '/e'},
      {title: 'F', url: '/f'},
    ])
    expect(result.map(l => l.title)).toEqual(['A', 'F'])
    expect(warn).toHaveBeenCalledTimes(4)
  })

  it('returns an empty array for non-array input', () => {
    expect(normalizeNavLinks(undefined)).toEqual([])
    expect(normalizeNavLinks('nope')).toEqual([])
    expect(normalizeNavLinks([])).toEqual([])
  })
})
