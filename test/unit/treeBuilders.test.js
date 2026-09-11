import {describe, it, expect} from 'vitest'
import {getTree, getDescendantTree} from '../../src/charts/util.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const childRef = (ref, frel = 'Birth', mrel = 'Birth') => ({ref, frel, mrel})

const family = (handle, father, mother, children = []) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children,
})

const person = (handle, {parentFamily = {}, families = []} = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  profile: {name_given: `Given ${handle}`, name_surname: `Surname ${handle}`},
  extended: {primary_parent_family: parentFamily, families},
})

// Ancestors: R has parents F and M. F has parents FF and FM. M only has a
// mother MM. FM has a father GONE who was not fetched.
const fR = family('fR', 'F', 'M', [childRef('R')])
const fF = family('fF', 'FF', 'FM', [childRef('F')])
const fM = family('fM', '', 'MM', [childRef('M')])
const fFM = family('fFM', 'GONE', '', [childRef('FM')])

// Descendants: D has children A (birth) and B (adopted by D, birth child of
// W1) with W1, and C with W2. A has a child X who was not fetched. fOther
// does not have D as a parent.
const fD1 = family('fD1', 'D', 'W1', [
  childRef('A'),
  childRef('B', 'Adopted', 'Birth'),
])
const fD2 = family('fD2', 'D', 'W2', [childRef('C')])
const fA = family('fA', 'A', '', [childRef('X')])
const fOther = family('fOther', 'Q', 'Z', [childRef('Y')])

const people = Object.fromEntries(
  [
    person('R', {parentFamily: fR}),
    person('F', {parentFamily: fF, families: [fR]}),
    person('M', {parentFamily: fM, families: [fR]}),
    person('FF', {families: [fF]}),
    person('FM', {parentFamily: fFM, families: [fF]}),
    person('MM', {families: [fM]}),
    person('D', {families: [fD1, fD2, fOther]}),
    person('W1', {families: [fD1]}),
    person('W2', {families: [fD2]}),
    person('A', {parentFamily: fD1, families: [fA]}),
    person('B', {parentFamily: fD1}),
    person('C', {parentFamily: fD2}),
  ].map(p => [p.handle, p])
)
const source = new FamilyGraph(Object.values(people))

const ancestors = (...args) => getTree(source, ...args)
const descendants = (...args) => getDescendantTree(source, ...args)

const emptyNode = (id, depth) => ({
  name_given: null,
  name_surname: null,
  id,
  depth,
  person: {},
})

describe('getTree', () => {
  it('returns an empty object for depth 0', () => {
    expect(ancestors('R', 0)).toEqual({})
  })

  it('returns the person without children at depth 1', () => {
    const tree = ancestors('R', 1)
    expect(tree).toEqual({
      name_given: 'Given R',
      name_surname: 'Surname R',
      id: 'p',
      depth: 0,
      person: people.R,
    })
    expect(tree.person).toBe(people.R)
    expect('children' in tree).toBe(false)
  })

  it('walks father then mother with path ids', () => {
    const tree = ancestors('R', 3, false)
    const [father, mother] = tree.children
    expect(tree.children.map(c => c.id)).toEqual(['pf', 'pm'])
    expect(father.person).toBe(people.F)
    expect(mother.person).toBe(people.M)
    expect(father.depth).toBe(1)
    expect(father.children.map(c => c.id)).toEqual(['pff', 'pfm'])
    expect(father.children.map(c => c.person)).toEqual([people.FF, people.FM])
    expect(mother.children.map(c => c.id)).toEqual(['pmm'])
    expect(mother.children[0].depth).toBe(2)
  })

  it('fills missing parents with empty nodes by default', () => {
    const mother = ancestors('R', 3).children[1]
    expect(mother.children).toEqual([
      emptyNode('pmf', 2),
      {
        name_given: 'Given MM',
        name_surname: 'Surname MM',
        id: 'pmm',
        depth: 2,
        person: people.MM,
      },
    ])
  })

  it('keeps filling empty nodes down to the depth limit', () => {
    const emptyFather = ancestors('M', 3).children[0]
    expect(emptyFather).toEqual({
      ...emptyNode('pf', 1),
      children: [emptyNode('pff', 2), emptyNode('pfm', 2)],
    })
  })

  it('keeps a parent that was not fetched as an empty person', () => {
    expect(ancestors('FM', 2, false).children).toEqual([emptyNode('pf', 1)])
  })

  it('gives a person without parents an empty children list', () => {
    expect(ancestors('FF', 3, false).children).toEqual([])
  })
})

describe('getDescendantTree', () => {
  it('returns an empty object for depth 0', () => {
    expect(descendants('D', 0)).toEqual({})
  })

  it('returns the person without children at depth 1', () => {
    const tree = descendants('D', 1)
    expect(tree.person).toBe(people.D)
    expect('children' in tree).toBe(false)
  })

  it('collects birth children across families with running ids', () => {
    const tree = descendants('D', 2)
    expect(tree.children.map(c => c.id)).toEqual(['pc0', 'pc1'])
    expect(tree.children.map(c => c.person)).toEqual([people.A, people.C])
    expect(tree.children.every(c => !('children' in c))).toBe(true)
  })

  it('uses the mother relation for mothers', () => {
    const tree = descendants('W1', 2)
    expect(tree.children.map(c => c.person)).toEqual([people.A, people.B])
  })

  it('keeps a child that was not fetched as an empty person', () => {
    const [childA] = descendants('D', 3).children
    expect(childA.children).toEqual([
      {name_given: null, name_surname: null, id: 'pc0c0', depth: 2, person: {}},
    ])
  })

  it('gives a person without families an empty children list', () => {
    expect(descendants('C', 3).children).toEqual([])
  })
})
