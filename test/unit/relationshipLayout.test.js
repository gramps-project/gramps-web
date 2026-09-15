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
  const cluster = key => model.clusters.find(c => c.key === key)

  it('gives each family a cluster with its known partners', () => {
    expect(cluster('fRS').members).toEqual(['R', 'S'])
    expect(cluster('fFM').members).toEqual(['F', 'M'])
    expect(cluster('fA').members).toEqual(['A1', 'A2'])
    expect(cluster('fTV').members).toEqual(['V', 'T'])
    expect(cluster('p_X').members).toEqual(['X'])
  })

  it('puts a person in one cluster per family', () => {
    expect([...model.clustersOfPerson.get('R')]).toEqual(['fRS', 'fRT'])
    expect([...model.clustersOfPerson.get('T')]).toEqual(['fRT', 'fTV'])
  })

  it('links children from all parent families with their relation', () => {
    const childEdges = model.edges
      .filter(edge => edge.kind === 'child')
      .map(({familyKey, fromPerson, toPerson, relation}) => [
        familyKey,
        fromPerson,
        toPerson,
        relation,
      ])
    expect(childEdges).toEqual([
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
      familyKey: 'fP',
      fromPerson: 'P',
      toPerson: 'C',
    })
  })

  it('gives a placeholder parent to people without known parents in several families', () => {
    expect(cluster('p_fakeparentT')).toMatchObject({
      members: ['fakeparentT'],
      placeholder: true,
    })
    expect(model.edges.filter(edge => edge.kind === 'placeholder')).toEqual([
      {
        familyKey: 'p_fakeparentT',
        fromPerson: 'fakeparentT',
        toPerson: 'T',
        kind: 'placeholder',
      },
    ])
    expect(cluster('p_fakeparentS')).toBeUndefined()
  })
})

describe('relationshipDot', () => {
  it('links a child to each of its nodes', () => {
    const dot = relationshipDot(relationshipModel(graph))
    expect(dot).toContain('"node_fFM" -> "node_fRSxR"')
    expect(dot).toContain('"node_fFM" -> "node_fRTxR"')
  })
})

describe('layoutRelationships', () => {
  it('places the first node of the root person at the origin', async () => {
    const layout = await layoutRelationships(graph, 'R')
    expect(layout.root).toMatchObject({kind: 'person', handle: 'R', x: 0, y: 0})
    expect(layout.root.key).toBe('fRS:R')
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

  it('returns person, family and placeholder nodes', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const kinds = kind => layout.nodes.filter(node => node.kind === kind)
    expect(kinds('person').filter(node => node.handle === 'R')).toHaveLength(2)
    expect(kinds('family').map(node => node.key)).toContain('family:fA')
    expect(kinds('placeholder').map(node => node.key)).toEqual([
      'placeholder:fakeparentT',
    ])
    expect(kinds('person').find(node => node.handle === 'X')).toBeDefined()
  })

  it('draws parents above their children', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const node = key => layout.nodes.find(n => n.key === key)
    expect(node('fFM:F').y).toBeLessThan(node('fRS:R').y)
    expect(node('fRS:R').y).toBeLessThan(node('p_K:K').y)
  })

  it('links children with their relation', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const adopted = layout.links.filter(link => link.relation === 'Adopted')
    expect(adopted.map(link => [link.source.key, link.target.key])).toEqual([
      ['family:fA', 'fRS:R'],
      ['family:fA', 'fRT:R'],
    ])
  })

  it('returns the route of each link from its source down to its target', async () => {
    const layout = await layoutRelationships(graph, 'R')
    for (const link of layout.links) {
      expect(link.points.length).toBeGreaterThan(1)
      expect(link.points[0][1]).toBeGreaterThanOrEqual(link.source.y)
      expect(link.points.at(-1)[1]).toBeLessThanOrEqual(link.target.y)
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
