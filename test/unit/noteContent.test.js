import {describe, it, expect} from 'vitest'
import {_parseGrampsHref} from '../../src/components/GrampsjsNoteContent.js'

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
