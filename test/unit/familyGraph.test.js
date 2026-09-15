import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const childRef = (ref, frel = 'Birth', mrel = 'Birth') => ({ref, frel, mrel})

const family = (handle, father, mother, children = []) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children,
})

// R is the father in f1 and the mother in f2, and appears in f3 without
// being a parent there. S has no extended data.
const fParents = family('fP', 'F', '', [childRef('R')])
const f1 = family('f1', 'R', 'S', [
  childRef('A'),
  childRef('B', 'Adopted', 'Birth'),
])
const f2 = family('f2', 'T', 'R', [childRef('C', 'Birth', 'Foster')])
const f3 = family('f3', 'Q', 'Z', [childRef('Y')])
const R = {
  handle: 'R',
  gramps_id: 'I1',
  extended: {primary_parent_family: fParents, families: [f1, f2, f3]},
}
const S = {handle: 'S', gramps_id: 'I2'}
const graph = new FamilyGraph([R, S])

describe('FamilyGraph', () => {
  it('looks up people by handle and Gramps ID', () => {
    expect(graph.person('R')).toBe(R)
    expect(graph.personByGrampsId('I2')).toBe(S)
    expect(graph.person('X')).toBeUndefined()
    expect(graph.personByGrampsId('I9')).toBeUndefined()
  })

  it('keeps the first person for a duplicate Gramps ID', () => {
    const duplicates = new FamilyGraph([
      {handle: 'a', gramps_id: 'I1'},
      {handle: 'b', gramps_id: 'I1'},
    ])
    expect(duplicates.personByGrampsId('I1').handle).toBe('a')
  })

  it('returns parents with an empty string for unknown ones', () => {
    expect(graph.parents('R')).toEqual({father: 'F', mother: ''})
    expect(graph.parents('S')).toEqual({father: '', mother: ''})
    expect(graph.parents('X')).toEqual({father: '', mother: ''})
  })

  it('returns children across the families where the person is a parent', () => {
    expect(graph.children('R')).toEqual(['A', 'B', 'C'])
  })

  it('filters birth children by the relation to this parent', () => {
    expect(graph.children('R', {birthOnly: true})).toEqual(['A'])
  })

  it('returns no children for a person without families', () => {
    expect(graph.children('S')).toEqual([])
    expect(graph.children('X')).toEqual([])
  })

  it('returns all people in the order they were fetched', () => {
    expect(graph.people()).toEqual([R, S])
  })

  it('indexes the families people refer to', () => {
    expect(graph.family('f2')).toBe(f2)
    expect(graph.family('fP')).toBe(fParents)
    expect(graph.family('nope')).toBeUndefined()
  })

  it('returns the families in which a person is a partner', () => {
    expect(graph.partnerFamilies('R')).toEqual([f1, f2, f3])
    expect(graph.partnerFamilies('S')).toEqual([])
  })

  it('returns the primary parent family first, then the other ones', () => {
    const adoptive = family('fA', 'A', 'B', [childRef('K', 'Adopted')])
    const birth = family('fB', 'F', 'M', [childRef('K')])
    const withParents = new FamilyGraph([
      {
        handle: 'K',
        gramps_id: 'I3',
        extended: {
          primary_parent_family: birth,
          parent_families: [adoptive, birth],
        },
      },
    ])
    expect(withParents.parentFamilies('K')).toEqual([birth, adoptive])
    expect(withParents.family('fA')).toBe(adoptive)
    expect(graph.parentFamilies('R')).toEqual([fParents])
    expect(graph.parentFamilies('S')).toEqual([])
  })
})
