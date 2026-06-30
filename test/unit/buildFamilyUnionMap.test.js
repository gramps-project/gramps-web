import {describe, it, expect} from 'vitest'
import {buildFamilyUnionMap} from '../../src/charts/RelationshipChart.js'

describe('buildFamilyUnionMap', () => {
  it('returns an empty map for an empty people array', () => {
    expect(buildFamilyUnionMap([])).to.deep.equal({})
  })

  it('returns an empty map for non-array input', () => {
    expect(buildFamilyUnionMap(null)).to.deep.equal({})
    expect(buildFamilyUnionMap(undefined)).to.deep.equal({})
    expect(buildFamilyUnionMap('string')).to.deep.equal({})
  })

  it('returns an empty map when no person has profile.families', () => {
    const people = [
      {handle: 'P1', profile: {name_given: 'Alice'}},
      {handle: 'P2'},
      {handle: 'P3', profile: {}},
    ]
    expect(buildFamilyUnionMap(people)).to.deep.equal({})
  })

  it('maps a single family correctly with all fields present', () => {
    const marriage = {date: '1990-01-01'}
    const divorce = null
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage,
              divorce,
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(map.F1).to.deep.equal({
      maritalStatus: 'married',
      marriage,
      divorce: null,
    })
  })

  it('defaults maritalStatus to "unknown" when marital_status is absent', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              // marital_status intentionally absent
              marriage: null,
              divorce: null,
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(map.F1.maritalStatus).to.equal('unknown')
  })

  it('defaults marriage and divorce to null when absent', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'partners',
              // marriage/divorce absent
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(map.F1.marriage).to.be.null
    expect(map.F1.divorce).to.be.null
  })

  it('two people sharing the same family handle produce one entry', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage: {date: '2000'},
              divorce: null,
            },
          ],
        },
      },
      {
        handle: 'P2',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage: {date: '2000'},
              divorce: null,
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(Object.keys(map)).to.deep.equal(['F1'])
    expect(map.F1.maritalStatus).to.equal('married')
  })

  it('keeps the first writer when two people disagree on the same family', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage: {date: '2000'},
              divorce: null,
            },
          ],
        },
      },
      {
        handle: 'P2',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'divorced',
              marriage: {date: '2000'},
              divorce: {date: '2010'},
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(Object.keys(map)).to.deep.equal(['F1'])
    expect(map.F1.maritalStatus).to.equal('married')
    expect(map.F1.divorce).to.equal(null)
  })

  it('handles multiple distinct families across multiple people', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage: null,
              divorce: null,
            },
            {
              handle: 'F2',
              marital_status: 'divorced',
              marriage: null,
              divorce: {date: '2010'},
            },
          ],
        },
      },
      {
        handle: 'P3',
        profile: {
          families: [
            {
              handle: 'F3',
              marital_status: 'partners',
              marriage: null,
              divorce: null,
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(Object.keys(map).sort()).to.deep.equal(['F1', 'F2', 'F3'])
    expect(map.F1.maritalStatus).to.equal('married')
    expect(map.F2.maritalStatus).to.equal('divorced')
    expect(map.F2.divorce).to.deep.equal({date: '2010'})
    expect(map.F3.maritalStatus).to.equal('partners')
  })

  it('skips family entries without a handle', () => {
    const people = [
      {
        handle: 'P1',
        profile: {
          families: [
            {marital_status: 'married'}, // no handle
            {handle: 'F1', marital_status: 'widowed'},
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(Object.keys(map)).to.deep.equal(['F1'])
  })

  it('handles missing profile gracefully', () => {
    const people = [
      {handle: 'P1'}, // no profile
      {
        handle: 'P2',
        profile: {
          families: [
            {
              handle: 'F1',
              marital_status: 'married',
              marriage: null,
              divorce: null,
            },
          ],
        },
      },
    ]
    const map = buildFamilyUnionMap(people)
    expect(map.F1.maritalStatus).to.equal('married')
  })
})
