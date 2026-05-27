import {describe, it, expect} from 'vitest'
import {parseHtmlToStyledText} from '../../src/components/styledTextPaste.js'

// Helper: find a tag by name in the result
const tag = (result, name) => result.tags.find(t => t.name === name)

describe('parseHtmlToStyledText', () => {
  // ── plain text ────────────────────────────────────────────────────────────

  describe('plain text', () => {
    it('returns the text with no tags for a plain string', () => {
      const r = parseHtmlToStyledText('hello')
      expect(r.string).toBe('hello')
      expect(r.tags).toEqual([])
    })

    it('returns empty string and no tags for empty input', () => {
      const r = parseHtmlToStyledText('')
      expect(r.string).toBe('')
      expect(r.tags).toEqual([])
    })
  })

  // ── semantic bold / italic / underline ────────────────────────────────────

  describe('semantic inline elements', () => {
    it('wraps <b> in a bold tag covering the full range', () => {
      const r = parseHtmlToStyledText('<b>hello</b>')
      expect(r.string).toBe('hello')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })

    it('wraps <strong> as bold', () => {
      const r = parseHtmlToStyledText('<strong>hi</strong>')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <i> as italic', () => {
      const r = parseHtmlToStyledText('<i>hi</i>')
      expect(tag(r, 'italic')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <em> as italic', () => {
      const r = parseHtmlToStyledText('<em>hi</em>')
      expect(tag(r, 'italic')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <u> as underline', () => {
      const r = parseHtmlToStyledText('<u>hi</u>')
      expect(tag(r, 'underline')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <s> as strikethrough', () => {
      const r = parseHtmlToStyledText('<s>hi</s>')
      expect(tag(r, 'strikethrough')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <del> as strikethrough', () => {
      const r = parseHtmlToStyledText('<del>hi</del>')
      expect(tag(r, 'strikethrough')?.ranges).toEqual([[0, 2]])
    })

    it('wraps <sup> as superscript', () => {
      const r = parseHtmlToStyledText('<sup>2</sup>')
      expect(tag(r, 'superscript')?.ranges).toEqual([[0, 1]])
    })
  })

  // ── links ─────────────────────────────────────────────────────────────────

  describe('links', () => {
    it('creates a link tag for <a href>', () => {
      const r = parseHtmlToStyledText('<a href="https://example.com">click</a>')
      expect(r.string).toBe('click')
      expect(tag(r, 'link')).toEqual({
        name: 'link',
        value: 'https://example.com/', // new URL() normalizes by adding trailing slash
        ranges: [[0, 5]],
      })
    })

    it('allows gramps: protocol', () => {
      const r = parseHtmlToStyledText(
        '<a href="gramps://Person/handle/abc">name</a>'
      )
      expect(tag(r, 'link')?.value).toBe('gramps://Person/handle/abc')
    })

    it('drops javascript: hrefs', () => {
      const r = parseHtmlToStyledText('<a href="javascript:alert(1)">bad</a>')
      expect(r.string).toBe('bad')
      expect(tag(r, 'link')).toBeUndefined()
    })

    it('drops relative hrefs', () => {
      const r = parseHtmlToStyledText('<a href="/relative">text</a>')
      expect(tag(r, 'link')).toBeUndefined()
    })
  })

  // ── CSS-based formatting ──────────────────────────────────────────────────

  describe('CSS inline styles', () => {
    it('reads font-weight:bold as bold', () => {
      const r = parseHtmlToStyledText(
        '<span style="font-weight:bold">hi</span>'
      )
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 2]])
    })

    it('reads font-weight:700 as bold', () => {
      const r = parseHtmlToStyledText('<span style="font-weight:700">hi</span>')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 2]])
    })

    it('reads font-style:italic as italic', () => {
      const r = parseHtmlToStyledText(
        '<span style="font-style:italic">hi</span>'
      )
      expect(tag(r, 'italic')?.ranges).toEqual([[0, 2]])
    })

    it('reads text-decoration:underline', () => {
      const r = parseHtmlToStyledText(
        '<span style="text-decoration:underline">hi</span>'
      )
      expect(tag(r, 'underline')?.ranges).toEqual([[0, 2]])
    })

    it('reads text-decoration:line-through as strikethrough', () => {
      const r = parseHtmlToStyledText(
        '<span style="text-decoration:line-through">hi</span>'
      )
      expect(tag(r, 'strikethrough')?.ranges).toEqual([[0, 2]])
    })

    it('does not pick up font-family (ambient document style)', () => {
      const r = parseHtmlToStyledText(
        '<span style="font-family:Arial, sans-serif">hi</span>'
      )
      expect(tag(r, 'fontface')).toBeUndefined()
    })

    it('does not pick up font-size (ambient document style)', () => {
      const r = parseHtmlToStyledText('<span style="font-size:24px">hi</span>')
      expect(tag(r, 'fontsize')).toBeUndefined()
    })

    it('does not pick up color (ambient document style)', () => {
      const r = parseHtmlToStyledText(
        '<span style="color:rgb(255,0,0)">hi</span>'
      )
      expect(tag(r, 'fontcolor')).toBeUndefined()
    })

    it('does not pick up background-color (ambient document style)', () => {
      const r = parseHtmlToStyledText(
        '<span style="background-color:yellow">hi</span>'
      )
      expect(tag(r, 'highlight')).toBeUndefined()
    })
  })

  // ── tag range positions ───────────────────────────────────────────────────

  describe('range positions', () => {
    it('covers only the formatted portion in a mixed string', () => {
      // "hello world" — only "world" is bold
      const r = parseHtmlToStyledText('hello <b>world</b>')
      expect(r.string).toBe('hello world')
      expect(tag(r, 'bold')?.ranges).toEqual([[6, 11]])
    })

    it('covers only the formatted portion at the start', () => {
      const r = parseHtmlToStyledText('<b>hello</b> world')
      expect(r.string).toBe('hello world')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })
  })

  // ── nested formatting ─────────────────────────────────────────────────────

  describe('nested formatting', () => {
    it('applies both bold and italic when nested', () => {
      const r = parseHtmlToStyledText('<b><i>hi</i></b>')
      expect(r.string).toBe('hi')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 2]])
      expect(tag(r, 'italic')?.ranges).toEqual([[0, 2]])
    })

    it('bold wraps italic in a larger range', () => {
      // "hello world" — all bold, only "world" also italic
      const r = parseHtmlToStyledText('<b>hello <i>world</i></b>')
      expect(r.string).toBe('hello world')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 11]])
      expect(tag(r, 'italic')?.ranges).toEqual([[6, 11]])
    })
  })

  // ── adjacent same-tag spans ───────────────────────────────────────────────

  describe('adjacent same-tag spans merge', () => {
    it('merges two adjacent bold spans into one range', () => {
      const r = parseHtmlToStyledText('<b>foo</b><b>bar</b>')
      expect(r.string).toBe('foobar')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 6]])
    })

    it('does not merge bold spans separated by plain text', () => {
      const r = parseHtmlToStyledText('<b>foo</b>x<b>bar</b>')
      expect(r.string).toBe('fooxbar')
      expect(tag(r, 'bold')?.ranges).toEqual([
        [0, 3],
        [4, 7],
      ])
    })
  })

  // ── block elements → newlines ─────────────────────────────────────────────

  describe('block element newlines', () => {
    it('separates two <p> elements with a blank line', () => {
      const r = parseHtmlToStyledText('<p>one</p><p>two</p>')
      expect(r.string).toBe('one\n\ntwo')
    })

    it('does not produce a trailing newline from a single <p>', () => {
      const r = parseHtmlToStyledText('<p>only</p>')
      expect(r.string).toBe('only')
    })

    it('does not produce a leading newline', () => {
      const r = parseHtmlToStyledText('<p>first</p><p>second</p>')
      expect(r.string.startsWith('\n')).toBe(false)
    })

    it('does not double-newline when block follows <br>', () => {
      // <br> adds \n; then the block end would add \n\n only if text doesn't
      // already end with \n\n — so line2 + block → line2\n\n → fine
      const r = parseHtmlToStyledText('<p>line1<br>line2</p><p>line3</p>')
      expect(r.string).toBe('line1\nline2\n\nline3')
    })

    it('handles <br> inside inline content', () => {
      const r = parseHtmlToStyledText('line1<br>line2')
      expect(r.string).toBe('line1\nline2')
    })

    it('separates h1-h6 from the following paragraph with a blank line', () => {
      const r = parseHtmlToStyledText('<h2>Title</h2><p>body</p>')
      expect(r.string).toBe('Title\n\nbody')
    })

    it('also adds a blank line before a heading when preceded by text', () => {
      const r = parseHtmlToStyledText('<p>intro</p><h2>Title</h2><p>body</p>')
      expect(r.string).toBe('intro\n\nTitle\n\nbody')
    })

    it('strips leading newlines (e.g. from a leading <br>)', () => {
      const r = parseHtmlToStyledText('<br><b>hello</b>')
      expect(r.string).toBe('hello')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })
  })

  // ── formatting across block elements ─────────────────────────────────────

  describe('formatting range clipping at trimmed boundary', () => {
    it('bold on a heading does not bleed into the blank-line separator', () => {
      const r = parseHtmlToStyledText('<h2><b>Title</b></h2><p>body</p>')
      expect(r.string).toBe('Title\n\nbody')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })
  })

  // ── headings ──────────────────────────────────────────────────────────────

  describe('headings', () => {
    it('makes heading text bold', () => {
      const r = parseHtmlToStyledText('<h2>Title</h2>')
      expect(r.string).toBe('Title')
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })

    it('does not double-apply bold when heading contains explicit <b>', () => {
      const r = parseHtmlToStyledText('<h2><b>Title</b></h2>')
      expect(r.string).toBe('Title')
      // merged into a single range, not duplicated
      expect(tag(r, 'bold')?.ranges).toEqual([[0, 5]])
    })
  })

  // ── unicode ───────────────────────────────────────────────────────────────

  describe('unicode / emoji', () => {
    it('counts emoji as one code point in range indices', () => {
      // "A🎉B" — bold only on B (index 2, length 1 in code points)
      const r = parseHtmlToStyledText('A🎉<b>B</b>')
      expect(r.string).toBe('A🎉B')
      expect(tag(r, 'bold')?.ranges).toEqual([[2, 3]])
    })
  })

  // ── lists ─────────────────────────────────────────────────────────────────

  describe('lists', () => {
    it('renders <ul> items with bullet markers', () => {
      const r = parseHtmlToStyledText('<ul><li>one</li><li>two</li></ul>')
      expect(r.string).toBe('• one\n• two')
    })

    it('renders <ol> items with incrementing numbers', () => {
      const r = parseHtmlToStyledText('<ol><li>first</li><li>second</li></ol>')
      expect(r.string).toBe('1. first\n2. second')
    })

    it('adds blank lines around a list when surrounded by paragraphs', () => {
      const r = parseHtmlToStyledText(
        '<p>intro</p><ul><li>item</li></ul><p>outro</p>'
      )
      expect(r.string).toBe('intro\n\n• item\n\noutro')
    })

    it('indents nested list items by two spaces per level', () => {
      const r = parseHtmlToStyledText(
        '<ul><li>a<ul><li>a1</li><li>a2</li></ul></li><li>b</li></ul>'
      )
      expect(r.string).toBe('• a\n  • a1\n  • a2\n• b')
    })

    it('preserves formatting inside list items', () => {
      const r = parseHtmlToStyledText('<ul><li><b>bold</b> text</li></ul>')
      expect(r.string).toBe('• bold text')
      // "bold" starts at index 2 (after "• "), length 4
      expect(tag(r, 'bold')?.ranges).toEqual([[2, 6]])
    })

    it('resets counter for a new <ol>', () => {
      const r = parseHtmlToStyledText('<ol><li>a</li></ol><ol><li>b</li></ol>')
      expect(r.string).toBe('1. a\n\n1. b')
    })
  })

  // ── whitespace normalisation (CSS white-space:normal) ────────────────────

  describe('whitespace normalisation', () => {
    it('collapses a newline between inline elements to a space', () => {
      // Common when copying from Wikipedia / GitHub — source wrapping
      const r = parseHtmlToStyledText('<b>hello</b>\nworld')
      expect(r.string).toBe('hello world')
    })

    it('collapses newline+spaces inside a text node to one space', () => {
      const r = parseHtmlToStyledText('foo\n  bar')
      expect(r.string).toBe('foo bar')
    })

    it('does not create a double space when a normalised node starts with a space after a space', () => {
      const r = parseHtmlToStyledText('<b>hello</b> \n world')
      expect(r.string).toBe('hello world')
    })

    it('bold range is correct after whitespace is collapsed', () => {
      // "foo\nbar" → "foo bar"; bold covers "bar" which is now at index 4
      const r = parseHtmlToStyledText('foo\n<b>bar</b>')
      expect(r.string).toBe('foo bar')
      expect(tag(r, 'bold')?.ranges).toEqual([[4, 7]])
    })

    it('preserves intentional newlines from <br>', () => {
      const r = parseHtmlToStyledText('line1<br>\nline2')
      // The \n after <br> is a source newline that collapses to a space,
      // but the <br> itself produces the real \n
      expect(r.string).toBe('line1\nline2')
    })

    it('preserves whitespace inside <pre>', () => {
      const r = parseHtmlToStyledText('<pre>hello\n  world</pre>')
      expect(r.string).toBe('hello\n  world')
    })

    it('does not strip non-breaking spaces', () => {
      const r = parseHtmlToStyledText('hello world')
      expect(r.string).toBe('hello world')
    })
  })

  // ── ignored / stripped elements ───────────────────────────────────────────

  describe('ignored elements', () => {
    it('strips <script> content entirely', () => {
      const r = parseHtmlToStyledText('before<script>evil()</script>after')
      expect(r.string).toBe('beforeafter')
    })

    it('strips <style> content entirely', () => {
      const r = parseHtmlToStyledText('before<style>.x{}</style>after')
      expect(r.string).toBe('beforeafter')
    })

    it('preserves text inside unknown/unsupported elements', () => {
      const r = parseHtmlToStyledText('<table><tr><td>cell</td></tr></table>')
      expect(r.string).toBe('cell')
    })
  })
})
