import {describe, it, expect} from 'vitest'
import {
  IMAGE_PLACEHOLDER,
  mediaHandleFromLink,
  mediaLink,
  inlineImageHandles,
} from '../../src/inlineImages.js'

const P = IMAGE_PLACEHOLDER

function linkTag(value, ranges) {
  return {name: 'link', value, ranges}
}

describe('mediaHandleFromLink', () => {
  it('extracts the handle', () => {
    expect(mediaHandleFromLink('gramps://Media/handle/abc123')).toBe('abc123')
  })

  it('returns null for other links', () => {
    expect(mediaHandleFromLink('gramps://Person/handle/abc123')).toBeNull()
    expect(mediaHandleFromLink('https://example.com')).toBeNull()
    expect(mediaHandleFromLink('')).toBeNull()
    expect(mediaHandleFromLink(undefined)).toBeNull()
    expect(mediaHandleFromLink(null)).toBeNull()
  })
})

describe('mediaLink', () => {
  it('builds a gramps link', () => {
    expect(mediaLink('abc123')).toBe('gramps://Media/handle/abc123')
  })

  it('round-trips with mediaHandleFromLink', () => {
    expect(mediaHandleFromLink(mediaLink('h1'))).toBe('h1')
  })
})

describe('inlineImageHandles', () => {
  it('returns an empty list without tags or text', () => {
    expect(inlineImageHandles(undefined)).toEqual([])
    expect(inlineImageHandles({string: 'abc'})).toEqual([])
    expect(inlineImageHandles({string: 'abc', tags: []})).toEqual([])
  })

  it('extracts the handle of a placeholder link', () => {
    const st = {
      string: `a${P}b`,
      tags: [linkTag(mediaLink('h1'), [[1, 2]])],
    }
    expect(inlineImageHandles(st)).toEqual(['h1'])
  })

  it('orders handles by position, not tag order', () => {
    const st = {
      string: `${P}x${P}`,
      tags: [
        linkTag(mediaLink('second'), [[2, 3]]),
        linkTag(mediaLink('first'), [[0, 1]]),
      ],
    }
    expect(inlineImageHandles(st)).toEqual(['first', 'second'])
  })

  it('removes duplicates', () => {
    const st = {
      string: `${P}${P}`,
      tags: [
        linkTag(mediaLink('h1'), [
          [0, 1],
          [1, 2],
        ]),
      ],
    }
    expect(inlineImageHandles(st)).toEqual(['h1'])
  })

  it('ignores non-media links', () => {
    const st = {
      string: P,
      tags: [linkTag('gramps://Person/handle/p1', [[0, 1]])],
    }
    expect(inlineImageHandles(st)).toEqual([])
  })

  it('ignores non-link tags', () => {
    const st = {
      string: P,
      tags: [{name: 'bold', value: mediaLink('h1'), ranges: [[0, 1]]}],
    }
    expect(inlineImageHandles(st)).toEqual([])
  })

  it('ignores ranges over normal text', () => {
    const st = {
      string: 'abc',
      tags: [linkTag(mediaLink('h1'), [[0, 1]])],
    }
    expect(inlineImageHandles(st)).toEqual([])
  })

  it('ignores ranges that cover more than the placeholder', () => {
    const st = {
      string: `a${P}b`,
      tags: [
        linkTag(mediaLink('h1'), [
          [0, 2],
          [1, 3],
          [0, 3],
        ]),
      ],
    }
    expect(inlineImageHandles(st)).toEqual([])
  })

  it('uses code-point offsets after non-BMP characters', () => {
    const st = {
      string: `😀${P}`,
      tags: [linkTag(mediaLink('h1'), [[1, 2]])],
    }
    expect(inlineImageHandles(st)).toEqual(['h1'])
  })

  it('does not match UTF-16 offsets after non-BMP characters', () => {
    const st = {
      string: `😀${P}`,
      tags: [linkTag(mediaLink('h1'), [[2, 3]])],
    }
    expect(inlineImageHandles(st)).toEqual([])
  })
})
