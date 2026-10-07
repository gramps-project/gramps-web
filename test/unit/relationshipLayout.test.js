import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {
  layoutRelationships,
  relationshipDot,
  relationshipModel,
} from '../../src/charts/layout/relationshipLayout.js'

const childRef = (ref, frel = 'Birth', mrel = 'Birth') => ({ref, frel, mrel})

const family = (handle, father, mother, children = []) => ({
  handle,
  type: 'Married',
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children,
})

const person = (handle, extended = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  profile: {gramps_id: `I_${handle}`, name_surname: handle},
  extended: {families: [], ...extended},
})

// R is the birth child of F and M and the adopted child of A1 and A2. R has
// K with S and L with T, and T also has a family with V. X is not related to
// anyone.
const fFM = family('fFM', 'F', 'M', [childRef('R')])
const fA = family('fA', 'A1', 'A2', [childRef('R', 'Adopted', 'Adopted')])
const fRS = family('fRS', 'R', 'S', [childRef('K')])
const fRT = family('fRT', 'R', 'T', [childRef('L')])
const fTV = family('fTV', 'V', 'T')
const people = [
  person('R', {
    primary_parent_family: fFM,
    parent_families: [fFM, fA],
    families: [fRS, fRT],
  }),
  person('F', {families: [fFM]}),
  person('M', {families: [fFM]}),
  person('A1', {families: [fA]}),
  person('A2', {families: [fA]}),
  person('S', {families: [fRS]}),
  person('T', {families: [fRT, fTV]}),
  person('V', {families: [fTV]}),
  person('K', {primary_parent_family: fRS}),
  person('L', {primary_parent_family: fRT}),
  person('X'),
]
const graph = new FamilyGraph(people)

describe('relationshipModel', () => {
  const model = relationshipModel(graph)
  const groupOf = handle => model.groupOfPerson.get(handle)

  it('puts partners, and partners of partners, into one group', () => {
    expect(groupOf('R').members).toEqual(['S', 'R', 'T', 'V'])
    expect(groupOf('F').members).toEqual(['F', 'M'])
    expect(groupOf('A2').members).toEqual(['A1', 'A2'])
    expect(groupOf('X').members).toEqual(['X'])
    expect(model.groups.flatMap(group => group.members).sort()).toEqual(
      people.map(p => p.handle).sort()
    )
  })

  it('places each family in the gap between its partners', () => {
    expect(
      groupOf('R').families.map(({family, left, right, adjacent}) => [
        family.handle,
        left,
        right,
        adjacent,
      ])
    ).toEqual([
      ['fRS', 0, 1, true],
      ['fRT', 1, 2, true],
      ['fTV', 2, 3, true],
    ])
  })

  it('puts a person with three partners between the first and the others', () => {
    const fRW = family('fRW', 'R', 'W')
    const more = new FamilyGraph([
      person('R', {families: [fRS, fRT, fRW]}),
      person('S', {families: [fRS]}),
      person('T', {families: [fRT]}),
      person('W', {families: [fRW]}),
    ])
    const [group] = relationshipModel(more).groups
    expect(group.members).toEqual(['S', 'R', 'T', 'W'])
    expect(group.families.find(f => f.family === fRW)).toMatchObject({
      left: 1,
      right: 3,
      adjacent: false,
    })
  })

  it('orders partners by the family list, whoever is fetched first', () => {
    const fRW = family('fRW', 'R', 'W')
    const more = new FamilyGraph([
      person('W', {families: [fRW]}),
      person('T', {families: [fRT]}),
      person('R', {families: [fRS, fRT, fRW]}),
      person('S', {families: [fRS]}),
    ])
    expect(relationshipModel(more).groups[0].members).toEqual([
      'S',
      'R',
      'T',
      'W',
    ])
  })

  it('puts the marker of a bracket under the partner with fewer partners', () => {
    const fRW = family('fRW', 'R', 'W')
    const more = new FamilyGraph([
      person('R', {families: [fRS, fRT, fRW]}),
      person('S', {families: [fRS]}),
      person('T', {families: [fRT]}),
      person('W', {families: [fRW]}),
    ])
    const [group] = relationshipModel(more).groups
    expect(group.families.find(f => f.family === fRW).outer).toBe(3)
  })

  it('puts the father of a single couple on the left', () => {
    const fPQ = family('fPQ', 'P', 'Q')
    const couple = new FamilyGraph([
      person('Q', {families: [fPQ]}),
      person('P', {families: [fPQ]}),
    ])
    expect(relationshipModel(couple).groups[0].members).toEqual(['P', 'Q'])
  })

  it('links children from all parent families with their relation', () => {
    expect(
      model.edges.map(({family, fromPerson, toPerson, relation}) => [
        family?.handle,
        fromPerson,
        toPerson,
        relation,
      ])
    ).toEqual([
      ['fFM', undefined, 'R', 'Birth'],
      ['fA', undefined, 'R', 'Adopted'],
      ['fRS', undefined, 'K', 'Birth'],
      ['fRT', undefined, 'L', 'Birth'],
    ])
  })

  it('links a child from the known parent when the other is not fetched', () => {
    const halfKnown = new FamilyGraph([
      person('C', {
        primary_parent_family: family('fP', 'P', 'Q', [childRef('C')]),
      }),
      person('P', {families: [family('fP', 'P', 'Q', [childRef('C')])]}),
    ])
    const [edge] = relationshipModel(halfKnown).edges
    expect(edge).toMatchObject({
      family: undefined,
      fromPerson: 'P',
      toPerson: 'C',
    })
  })
})

describe('relationshipDot', () => {
  it('makes one node per partner group and links children to their card', () => {
    const model = relationshipModel(graph)
    const dot = relationshipDot(model)
    expect(dot.match(/\[label=</g)).toHaveLength(model.groups.length)
    expect(dot).not.toContain('cluster')
    const name = handle => `group${model.groupOfPerson.get(handle).index}`
    // R is the second card of their group, below the gap between F and M
    expect(dot).toContain(`"${name('F')}":"g0":s -> "${name('R')}":"p1":n`)
  })
})

describe('layoutRelationships', () => {
  it('places the root person at the origin', async () => {
    const layout = await layoutRelationships(graph, 'R')
    expect(layout.root).toMatchObject({kind: 'person', handle: 'R', x: 0, y: 0})
    expect(layout.root.key).toBe('person:R')
    expect(layout.root.person).toBe(graph.person('R'))
  })

  it('keeps node keys when the root person changes', async () => {
    const fromR = await layoutRelationships(graph, 'R')
    const fromS = await layoutRelationships(graph, 'S')
    const keys = layout => layout.nodes.map(node => node.key)
    expect(keys(fromS)).toEqual(keys(fromR))
    const [dx, dy] = [
      fromS.nodes[0].x - fromR.nodes[0].x,
      fromS.nodes[0].y - fromR.nodes[0].y,
    ]
    fromR.nodes.forEach((node, i) => {
      expect(fromS.nodes[i].x - node.x).toBeCloseTo(dx)
      expect(fromS.nodes[i].y - node.y).toBeCloseTo(dy)
    })
  })

  it('returns one node per person and one per family', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const keys = kind =>
      layout.nodes.filter(node => node.kind === kind).map(node => node.key)
    expect(keys('person').sort()).toEqual(
      people.map(p => `person:${p.handle}`).sort()
    )
    expect(keys('family').sort()).toEqual([
      'family:fA',
      'family:fFM',
      'family:fRS',
      'family:fRT',
      'family:fTV',
    ])
  })

  it('draws partners side by side with their family between them', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const node = key => layout.nodes.find(n => n.key === key)
    const [s, r, t] = ['person:S', 'person:R', 'person:T'].map(node)
    expect(s.y).toBe(r.y)
    expect(t.y).toBe(r.y)
    expect(r.x - s.x).toBeCloseTo(t.x - r.x)
    expect(r.x - s.x).toBeGreaterThan(190)
    expect(node('family:fRT')).toMatchObject({x: (r.x + t.x) / 2, y: r.y})
  })

  it('joins partners who are not next to each other with a bracket', async () => {
    const fRW = family('fRW', 'R', 'W', [childRef('N')])
    const more = new FamilyGraph([
      person('R', {families: [fRS, fRT, fRW]}),
      person('S', {families: [fRS]}),
      person('T', {families: [fRT]}),
      person('W', {families: [fRW]}),
      person('N', {primary_parent_family: fRW}),
    ])
    const layout = await layoutRelationships(more, 'R')
    const node = key => layout.nodes.find(n => n.key === key)
    const marker = node('family:fRW')
    // The bracket runs from R's card to the marker under the left part of
    // W's card
    const {left, right, top} = marker.bracket
    expect(marker.x + left).toBeCloseTo(0)
    expect(marker.x + right).toBeCloseTo(node('person:W').x - 190 / 4)
    expect(marker.y + top).toBeCloseTo(45)
    expect(marker.y).toBeGreaterThan(0)
    expect(node('family:fRT').bracket).toBeUndefined()
    expect(node('person:N').y).toBeGreaterThan(marker.y)
  })

  it('draws parents above their children', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const node = key => layout.nodes.find(n => n.key === key)
    expect(node('person:F').y).toBeLessThan(node('person:R').y)
    expect(node('person:R').y).toBeLessThan(node('person:K').y)
  })

  it('links children with their relation', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const adopted = layout.links.filter(link => link.relation === 'Adopted')
    expect(adopted.map(link => [link.source.key, link.target.key])).toEqual([
      ['family:fA', 'person:R'],
    ])
  })

  it('returns the route of each link from its source down to the top of its target', async () => {
    const layout = await layoutRelationships(graph, 'R')
    for (const link of layout.links) {
      expect(link.points.length).toBeGreaterThan(1)
      expect(link.points[0][1]).toBeGreaterThanOrEqual(link.source.y)
      expect(link.points.at(-1)[0]).toBeCloseTo(link.target.x)
      expect(link.points.at(-1)[1]).toBeCloseTo(link.target.y - 45)
    }
  })

  it('contains every node in the bounds', async () => {
    const {nodes, bounds} = await layoutRelationships(graph, 'K')
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(bounds.xMin)
      expect(node.x).toBeLessThanOrEqual(bounds.xMax)
      expect(node.y).toBeGreaterThanOrEqual(bounds.yMin)
      expect(node.y).toBeLessThanOrEqual(bounds.yMax)
    }
  })
})
