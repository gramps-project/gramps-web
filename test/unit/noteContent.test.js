import {describe, it, expect, beforeAll, afterAll, vi} from 'vitest'
import {mdiImage} from '@mdi/js'
import {
  _parseGrampsHref,
  renderInlineImages,
} from '../../src/components/GrampsjsNoteContent.js'

describe('_parseGrampsHref', () => {
  it('parses a resolved person link with leading slash', () => {
    expect(_parseGrampsHref('/person/I0042')).to.deep.equal({
      objectType: 'person',
      grampsId: 'I0042',
    })
  })

  it('parses a resolved person link without leading slash', () => {
    expect(_parseGrampsHref('person/I0042')).to.deep.equal({
      objectType: 'person',
      grampsId: 'I0042',
    })
  })

  it('parses family links', () => {
    expect(_parseGrampsHref('/family/F0001')).to.deep.equal({
      objectType: 'family',
      grampsId: 'F0001',
    })
  })

  it('parses place links', () => {
    expect(_parseGrampsHref('/place/P0010')).to.deep.equal({
      objectType: 'place',
      grampsId: 'P0010',
    })
  })

  it('parses event links', () => {
    expect(_parseGrampsHref('/event/E0005')).to.deep.equal({
      objectType: 'event',
      grampsId: 'E0005',
    })
  })

  it('parses source links', () => {
    expect(_parseGrampsHref('/source/S0001')).to.deep.equal({
      objectType: 'source',
      grampsId: 'S0001',
    })
  })

  it('parses citation links', () => {
    expect(_parseGrampsHref('/citation/C0001')).to.deep.equal({
      objectType: 'citation',
      grampsId: 'C0001',
    })
  })

  it('parses repository links', () => {
    expect(_parseGrampsHref('/repository/R0001')).to.deep.equal({
      objectType: 'repository',
      grampsId: 'R0001',
    })
  })

  it('parses note links', () => {
    expect(_parseGrampsHref('/note/N0001')).to.deep.equal({
      objectType: 'note',
      grampsId: 'N0001',
    })
  })

  it('parses media links', () => {
    expect(_parseGrampsHref('/media/M0001')).to.deep.equal({
      objectType: 'media',
      grampsId: 'M0001',
    })
  })

  it('returns null for tag links', () => {
    expect(_parseGrampsHref('/tag/T0001')).to.be.null
  })

  it('returns null for external http links', () => {
    expect(_parseGrampsHref('https://example.com')).to.be.null
  })

  it('returns null for gramps:// raw links', () => {
    expect(_parseGrampsHref('gramps://Person/handle/abc123')).to.be.null
  })

  it('returns null for empty string', () => {
    expect(_parseGrampsHref('')).to.be.null
  })

  it('returns null for links with extra path segments', () => {
    expect(_parseGrampsHref('/person/I0042/extra')).to.be.null
  })
})

describe('renderInlineImages', () => {
  beforeAll(() => {
    vi.stubGlobal('__APIHOST__', 'http://api.test')
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  const mediaById = {
    M0001: {handle: 'mhandle1', desc: 'A photo', checksum: 'abc'},
    M0002: {handle: 'mhandle2', desc: '', checksum: 'def'},
  }

  function render(html, media = mediaById) {
    const container = document.createElement('div')
    container.innerHTML = html
    renderInlineImages(container, media)
    return container
  }

  it('turns a media placeholder link into an image with caption', () => {
    const container = render(
      '<p>Text</p><p><a href="/media/M0001">\uFFFC</a></p>'
    )
    const a = container.querySelector('a')
    expect(a.classList.contains('inline-image')).toBe(true)
    const img = a.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('mhandle1')
    expect(img.getAttribute('alt')).toBe('A photo')
    const caption = a.querySelector('.inline-image-caption')
    expect(caption.textContent).toBe('A photo')
    expect(a.textContent).not.toContain('\uFFFC')
  })

  it('adds no caption and uses the Gramps ID as alt text when the description is empty', () => {
    const container = render('<p><a href="/media/M0002">\uFFFC</a></p>')
    const a = container.querySelector('a')
    expect(a.classList.contains('inline-image')).toBe(true)
    expect(a.querySelector('img').getAttribute('alt')).toBe('M0002')
    expect(a.querySelector('.inline-image-caption')).toBeNull()
  })

  it('leaves anchors with other text untouched', () => {
    const html = '<p><a href="/media/M0001">photo</a></p>'
    const container = render(html)
    const a = container.querySelector('a')
    expect(a.classList.contains('inline-image')).toBe(false)
    expect(a.querySelector('img')).toBeNull()
    expect(a.textContent).toBe('photo')
  })

  it('leaves anchors with extra text around the placeholder untouched', () => {
    const container = render('<p><a href="/media/M0001"> \uFFFC</a></p>')
    expect(container.querySelector('img')).toBeNull()
  })

  it('leaves person links untouched', () => {
    const container = render('<p><a href="/person/I0001">Bob</a></p>')
    const a = container.querySelector('a')
    expect(a.classList.contains('inline-image')).toBe(false)
    expect(a.textContent).toBe('Bob')
  })

  it('leaves person links with a placeholder untouched', () => {
    const container = render('<p><a href="/person/I0001">\uFFFC</a></p>')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.inline-image')).toBeNull()
  })

  it('shows an icon for media missing from mediaById', () => {
    const container = render('<p><a href="/media/M9999">\uFFFC</a></p>')
    const a = container.querySelector('a')
    expect(a.classList.contains('inline-image')).toBe(false)
    expect(a.querySelector('img')).toBeNull()
    const icon = a.querySelector('grampsjs-icon.inline-image-icon')
    expect(icon).not.toBeNull()
    expect(icon.path).toBe(mdiImage)
    expect(a.getAttribute('aria-label')).toBe('M9999')
    expect(a.textContent).not.toContain('\uFFFC')
    expect(a.getAttribute('href')).toBe('/media/M9999')
  })

  it('handles a mixed document', () => {
    const container = render(
      '<p>Text</p><p><a href="/media/M0001">\uFFFC</a></p>' +
        '<p><a href="/person/I0001">Bob</a></p>'
    )
    expect(container.querySelectorAll('img').length).toBe(1)
    expect(container.querySelectorAll('a.inline-image').length).toBe(1)
    expect(container.querySelectorAll('a').length).toBe(2)
  })
})
