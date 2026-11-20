import {describe, it, expect} from 'vitest'
import {refLists, refCounts} from '../../src/components/refCounts.js'

describe('citations, notes and attributes of a secondary object', () => {
  it('are empty for an object without any', () => {
    expect(refLists(undefined)).to.deep.equal({
      citations: [],
      notes: [],
      attributes: [],
    })
    expect(refLists({ref: 'p1', frel: 'Birth'})).to.deep.equal({
      citations: [],
      notes: [],
      attributes: [],
    })
  })

  it('are read from the lists of the object', () => {
    const attr = {_class: 'Attribute', type: 'Age', value: '3'}
    expect(
      refLists({
        citation_list: ['c1', 'c2'],
        note_list: ['n1'],
        attribute_list: [attr],
      })
    ).to.deep.equal({
      citations: ['c1', 'c2'],
      notes: ['n1'],
      attributes: [attr],
    })
  })

  it('are counted per kind, leaving out the empty ones', () => {
    expect(refCounts(refLists({}))).to.deep.equal([])
    expect(
      refCounts(refLists({citation_list: ['c1', 'c2']})).map(([, n]) => n)
    ).to.deep.equal([2])
    expect(
      refCounts(
        refLists({
          citation_list: ['c1'],
          note_list: [],
          attribute_list: [{}, {}],
        })
      ).map(([, n]) => n)
    ).to.deep.equal([1, 2])
  })
})
