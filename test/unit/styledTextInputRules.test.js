import {describe, it, expect} from 'vitest'
import {matchInputRule} from '../../src/components/styledTextInputRules.js'
import {charLength, charSlice} from '../../src/charUtils.js'

// Apply a match to the text the way the editor does and return the resulting
// string together with the formatted slice
function apply(text, cursor = charLength(text)) {
  const match = matchInputRule(text, cursor)
  if (!match) return null
  let string = text
  ;[...match.removals].reverse().forEach(([s, e]) => {
    string = charSlice(string, 0, s) + charSlice(string, e)
  })
  return {
    ...match,
    string,
    formatted: charSlice(string, match.range[0], match.range[1]),
  }
}

describe('matchInputRule', () => {
  describe('inline formatting', () => {
    it.each([
      ['**bold**', 'bold', null],
      ['__bold__', 'bold', null],
      ['*italic*', 'italic', null],
      ['_italic_', 'italic', null],
      ['~~gone~~', 'strikethrough', null],
      ['==marked==', 'highlight', '#FFFF00'],
    ])('converts %s', (text, name, value) => {
      const r = apply(text)
      expect(r.tag).toEqual({name, value})
      expect(r.formatted).toBe(text.replace(/[*_~=]/g, ''))
      expect(r.string).toBe(r.formatted)
    })

    it('keeps the text before the opening marker', () => {
      const r = apply('say **hi**')
      expect(r.string).toBe('say hi')
      expect(r.range).toEqual([4, 6])
    })

    it('reports removals in ascending order', () => {
      expect(apply('a **b**').removals).toEqual([
        [2, 4],
        [5, 7],
      ])
    })

    it('matches with text after the cursor', () => {
      const r = apply('**a** rest', 5)
      expect(r.string).toBe('a rest')
      expect(r.range).toEqual([0, 1])
    })

    it('uses code-point offsets', () => {
      const r = apply('🙂 **a**')
      expect(r.range).toEqual([2, 3])
      expect(r.string).toBe('🙂 a')
    })

    it('does not look across lines', () => {
      expect(matchInputRule('*a\nb*', 5)).toBeNull()
    })

    it('waits for the second closing marker of a double marker', () => {
      expect(matchInputRule('**bold*', 7)).toBeNull()
    })

    it.each([
      ['** bold**'],
      ['**bold **'],
      ['* a*'],
      ['*a *'],
      ['**'],
      ['****'],
      ['hello'],
    ])('ignores %s', text => {
      expect(matchInputRule(text, charLength(text))).toBeNull()
    })

    it('ignores cursor positions outside the text', () => {
      expect(matchInputRule('*a*', 0)).toBeNull()
      expect(matchInputRule('*a*', 4)).toBeNull()
    })
  })

  describe('literal text that resembles markers', () => {
    it.each([
      ['*1850 Berlin, *'],
      ['Anna *1850 und Karl *'],
      ['snake_case_'],
      ['foo*bar*'],
      ['2*3*'],
      ['\\*escaped*'],
      ['https://example.org/_a_'],
      ['a == b =='],
    ])('leaves %s alone', text => {
      expect(matchInputRule(text, charLength(text))).toBeNull()
    })

    it('does not close before a letter', () => {
      expect(matchInputRule('_a_b', 3)).toBeNull()
    })

    it('still formats a whole URL', () => {
      expect(apply('**https://example.org**').formatted).toBe(
        'https://example.org'
      )
    })
  })

  describe('Markdown links', () => {
    it('converts [text](url)', () => {
      const r = apply('see [Gramps](https://gramps-project.org)')
      expect(r.string).toBe('see Gramps')
      expect(r.formatted).toBe('Gramps')
      expect(r.tag).toEqual({
        name: 'link',
        value: 'https://gramps-project.org/',
      })
    })

    it('accepts mailto links', () => {
      expect(apply('[mail](mailto:a@example.org)').tag.value).toBe(
        'mailto:a@example.org'
      )
    })

    it.each([
      ['[x](javascript:alert(1))'],
      ['[x](javascript:void)'],
      ['[x](relative/path)'],
      ['![image](https://example.org/a.png)'],
    ])('ignores %s', text => {
      expect(matchInputRule(text, charLength(text))).toBeNull()
    })
  })

  describe('object links', () => {
    it('converts [[Name]] and asks for the target', () => {
      const r = apply('Father: [[Anna Müller]]')
      expect(r.string).toBe('Father: Anna Müller')
      expect(r.formatted).toBe('Anna Müller')
      expect(r.tag).toBeNull()
      expect(r.query).toBe('Anna Müller')
    })

    it('shows the alias of [[Name|alias]]', () => {
      const r = apply('[[Anna Müller|Grandma]]')
      expect(r.string).toBe('Grandma')
      expect(r.formatted).toBe('Grandma')
      expect(r.query).toBe('Anna Müller')
    })

    it.each([['[[]]'], ['[[ ]]'], ['[[ |x]]'], ['[[a| ]]']])(
      'ignores %s',
      text => {
        expect(matchInputRule(text, charLength(text))).toBeNull()
      }
    )
  })

  describe('bare URLs', () => {
    it('links a URL when a space is typed', () => {
      const r = apply('see https://example.org ')
      expect(r.string).toBe('see https://example.org ')
      expect(r.range).toEqual([4, 23])
      expect(r.tag).toEqual({name: 'link', value: 'https://example.org/'})
    })

    it('links a URL when a newline is typed', () => {
      expect(apply('https://example.org\n').range).toEqual([0, 19])
    })

    it('excludes trailing punctuation', () => {
      expect(apply('(see https://example.org). ').formatted).toBe(
        'https://example.org'
      )
    })

    it.each([
      ['https:// '],
      ['ftp://example.org '],
      ['xhttps://example.org '],
      ['https://example.org'],
    ])('ignores %j', text => {
      expect(matchInputRule(text, charLength(text))).toBeNull()
    })
  })
})
