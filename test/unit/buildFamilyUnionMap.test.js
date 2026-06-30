import {describe, it, expect} from 'vitest'
import {buildFamilyUnionMap} from '../../src/charts/RelationshipChart.js'

describe('buildFamilyUnionMap', () => {
  it('returns an empty map for an empty people array', () => {
    expect(buildFamilyUnionMap([])).toEqual({})
  })

  it('returns an empty map for non-array input', () => {
    expect(buildFamilyUnionMap(null)).toEqual({})
    expect(buildFamilyUnionMap(undefined)).toEqual({})
    expect(buildFamilyUnionMap('string')).toEqual({})
  })

  it('returns an empty map when no person has profile.families', () => {
    const people = [
      {handle: 'P1', profile: {name_given: 'Alice'}},
      {handle: 'P2'},
      {handle: 'P3', profile: {}},
    ]
    expect(buildFamilyUnionMap(people)).toEqual({})
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
    expect(map.F1).toEqual({
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
    expect(map.F1.maritalStatus).toBe('unknown')
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
    expect(map.F1.marriage).toBeNull()
    expect(map.F1.divorce).toBeNull()
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
    expect(Object.keys(map)).toEqual(['F1'])
    expect(map.F1.maritalStatus).toBe('married')
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
    expect(Object.keys(map).sort()).toEqual(['F1', 'F2', 'F3'])
    expect(map.F1.maritalStatus).toBe('married')
    expect(map.F2.maritalStatus).toBe('divorced')
    expect(map.F2.divorce).toEqual({date: '2010'})
    expect(map.F3.maritalStatus).toBe('partners')
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
    expect(Object.keys(map)).toEqual(['F1'])
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
    expect(map.F1.maritalStatus).toBe('married')
  })
})
