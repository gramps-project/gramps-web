import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {
  archHeight,
  layoutRelationships,
  relationshipDot,
  relationshipModel,
} from '../../src/charts/layout/relationshipLayout.js'
import {trackSpacing} from '../../src/charts/layout/orthogonalRoutes.js'
import {familyMarkerPosition} from '../../src/charts/familyMarker.js'

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

  it('links a child once from a single parent of several families', () => {
    // C is M's birth child without a known father, and M's stepchild with
    // an unfetched husband; F is fostered and then adopted by M
    const fA = family('fA', undefined, 'M', [childRef('C')])
    const fB = family('fB', 'X', 'M', [
      childRef('C', 'Stepchild', 'Birth'),
      childRef('F', 'Adopted', 'Adopted'),
    ])
    const fF = family('fF', 'Y', 'M', [childRef('F', 'Foster', 'Foster')])
    const single = new FamilyGraph([
      person('M', {families: [fA, fB, fF]}),
      person('C', {primary_parent_family: fA, parent_families: [fA, fB]}),
      person('F', {primary_parent_family: fF, parent_families: [fF, fB]}),
    ])
    expect(
      relationshipModel(single).edges.map(
        ({fromPerson, toPerson, relation}) => [fromPerson, toPerson, relation]
      )
    ).toEqual([
      ['M', 'C', 'Birth'],
      ['M', 'F', 'Foster'],
    ])
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

  it('makes room for brackets below the bottom row', async () => {
    // R has four wives and is in the bottom row with a sister
    const fP = family('fP', 'F', 'M', [childRef('R'), childRef('Q')])
    const wives = ['S', 'T', 'W', 'Z']
    const fams = wives.map(wife => family(`fR${wife}`, 'R', wife))
    const more = new FamilyGraph([
      person('F', {families: [fP]}),
      person('M', {families: [fP]}),
      person('R', {primary_parent_family: fP, families: fams}),
      person('Q', {primary_parent_family: fP}),
      ...wives.map((wife, i) => person(wife, {families: [fams[i]]})),
    ])
    const {nodes, bounds} = await layoutRelationships(more, 'R')
    const node = key => nodes.find(n => n.key === key)
    expect(node('person:Q').y).toBe(node('person:R').y)
    const markers = nodes.filter(n => n.bracket)
    expect(markers).toHaveLength(2)
    for (const marker of markers) {
      // The bottom of the ring, relative to the node, is 35 + 6 pixels down
      expect(marker.y + 41).toBeLessThanOrEqual(bounds.yMax)
    }
  })

  it('makes room for an arch above the top row', async () => {
    // M marries the widow W and later her daughter D
    const fHW = family('fHW', 'H', 'W', [childRef('D')])
    const fMW = family('fMW', 'M', 'W')
    const fMD = family('fMD', 'M', 'D')
    const {nodes, bounds} = await layoutRelationships(
      new FamilyGraph([
        person('H', {families: [fHW]}),
        person('W', {families: [fHW, fMW]}),
        person('M', {families: [fMW, fMD]}),
        person('D', {primary_parent_family: fHW, families: [fMD]}),
      ]),
      'M'
    )
    const d = nodes.find(n => n.key === 'person:D')
    expect(d.y - 45 - archHeight).toBeGreaterThanOrEqual(bounds.yMin)
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
      expect(Math.abs(link.points.at(-1)[0] - link.target.x)).toBeLessThan(
        190 / 4
      )
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

// Returns the ways in which the routes of a layout break the rules of
// right-angled links, as strings, for cards of 190 by 90 pixels
function routeProblems({nodes, links, bounds}) {
  const [boxWidth, boxHeight, eps] = [190, 90, 0.01]
  const problems = []
  const marker = familyMarkerPosition(boxHeight)
  const cards = nodes.filter(node => node.kind === 'person')
  const horizontals = []
  const verticals = []
  const inBounds = ([x, y]) =>
    x >= bounds.xMin - eps &&
    x <= bounds.xMax + eps &&
    y >= bounds.yMin - eps &&
    y <= bounds.yMax + eps
  for (const link of links) {
    const {points, source, target, key} = link
    if (points.length < 4 || points.length % 2 !== 0) {
      problems.push(`${key} has ${points.length} points`)
      continue
    }
    const start =
      source.kind === 'family'
        ? [source.x + marker[0], source.y + marker[1]]
        : [source.x, source.y + boxHeight / 2]
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < eps
    const [endX, endY] = points.at(-1)
    if (
      !near(points[0], start) ||
      Math.abs(endY - (target.y - boxHeight / 2)) > eps ||
      Math.abs(endX - target.x) > boxWidth / 4
    ) {
      problems.push(`${key} does not join its source and target`)
    }
    if (!points.every(inBounds)) {
      problems.push(`${key} leaves the bounds`)
    }
    const arch = points[1][1] < points[0][1]
    for (let i = 1; i < points.length; i += 1) {
      const [[x0, y0], [x1, y1]] = [points[i - 1], points[i]]
      const vertical = i % 2 === 1
      if (vertical ? Math.abs(x1 - x0) > eps : Math.abs(y1 - y0) > eps) {
        problems.push(`${key} has a slanted line`)
      }
      // The line down from a source and the bar below it are shared
      const owner = i <= 2 && !arch ? source.key : `${key}#${i}`
      const [lo, hi, at] = vertical
        ? [Math.min(y0, y1), Math.max(y0, y1), x0]
        : [Math.min(x0, x1), Math.max(x0, x1), y0]
      ;(vertical ? verticals : horizontals).push({key, owner, lo, hi, at, i})
      for (const card of cards) {
        // An arch from a single parent starts under their own card
        if (arch && card === source) continue
        if (
          Math.min(x0, x1) < card.x + boxWidth / 2 - eps &&
          Math.max(x0, x1) > card.x - boxWidth / 2 + eps &&
          Math.min(y0, y1) < card.y + boxHeight / 2 - eps &&
          Math.max(y0, y1) > card.y - boxHeight / 2 + eps
        ) {
          problems.push(`${key} goes through ${card.key}`)
        }
      }
    }
  }
  const barY = new Map()
  for (const {owner, at, i, key} of horizontals) {
    if (i === 2 && !owner.includes('#')) {
      if (barY.has(owner) && Math.abs(barY.get(owner) - at) > eps) {
        problems.push(`${key} leaves the bar of ${owner}`)
      }
      barY.set(owner, at)
    }
  }
  // Lines of different owners do not run along each other
  for (const [lines, spacing] of [
    [horizontals, trackSpacing],
    [verticals, 0],
  ]) {
    lines.sort((a, b) => a.at - b.at)
    for (let i = 0; i < lines.length; i += 1) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const [a, b] = [lines[i], lines[j]]
        if (b.at - a.at > eps) break
        if (a.owner === b.owner || a.hi - a.lo < eps || b.hi - b.lo < eps) {
          continue
        }
        if (a.lo < b.hi + spacing - eps && b.lo < a.hi + spacing - eps) {
          problems.push(`${a.key} runs along ${b.key}`)
        }
      }
    }
  }
  return problems
}

// Returns a family tree of `generations` generations from one couple, made
// the same for each `seed`: the first couple has three children and each
// other couple up to five, some of whom are adopted, and children marry
// people from outside the tree, some of them more than once, or a cousin
function generatedTree(generations, seed) {
  let state = seed
  const random = () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
  const families = []
  let count = 0
  const newPerson = () => `P${(count += 1)}`
  let couples = [[newPerson(), newPerson()]]
  for (let g = 1; g < generations; g += 1) {
    const children = []
    const next = []
    for (const [father, mother] of couples) {
      const family = {
        handle: `F${families.length}`,
        father,
        mother,
        children: [],
      }
      families.push(family)
      const n = g === 1 ? 3 : Math.floor(random() * 6)
      for (let c = 0; c < n; c += 1) {
        const child = newPerson()
        family.children.push([child, random() < 0.1 ? 'Adopted' : 'Birth'])
        children.push(child)
      }
    }
    for (const child of children) {
      const r = random()
      if (r < 0.05 && children.length > 1) {
        // A cousin or sibling marriage across the generation
        const other = children[Math.floor(random() * children.length)]
        if (other !== child) next.push([child, other])
      } else if (r < 0.75) {
        next.push([child, newPerson()])
        if (random() < 0.15) next.push([child, newPerson()])
      }
    }
    couples = next
  }
  const familiesOf = new Map()
  const parentsOf = new Map()
  const records = families.map(({handle, father, mother, children}) => ({
    handle,
    type: 'Married',
    father_handle: father,
    mother_handle: mother,
    child_ref_list: children.map(([ref, rel]) => childRef(ref, rel, rel)),
  }))
  for (const record of records) {
    for (const partner of [record.father_handle, record.mother_handle]) {
      familiesOf.set(partner, [...(familiesOf.get(partner) ?? []), record])
    }
    for (const {ref} of record.child_ref_list) {
      parentsOf.set(ref, [...(parentsOf.get(ref) ?? []), record])
    }
  }
  const handles = Array.from({length: count}, (_, i) => `P${i + 1}`)
  return new FamilyGraph(
    handles.map(handle =>
      person(handle, {
        families: familiesOf.get(handle) ?? [],
        primary_parent_family: parentsOf.get(handle)?.[0],
        parent_families: parentsOf.get(handle) ?? [],
      })
    )
  )
}

describe('right-angled routes', () => {
  const cases = {
    'the base graph': [graph, 'R'],
    // A man marries his niece, so his link from his parents passes the row
    // of hers
    'an uncle who marries his niece': [
      (() => {
        const fG = family('fG', 'G1', 'G2', [childRef('U'), childRef('S')])
        const fS = family('fS', 'S', 'SW', [childRef('N'), childRef('B')])
        const fU = family('fU', 'U', 'N', [childRef('K')])
        return new FamilyGraph([
          person('G1', {families: [fG]}),
          person('G2', {families: [fG]}),
          person('U', {primary_parent_family: fG, families: [fU]}),
          person('S', {primary_parent_family: fG, families: [fS]}),
          person('SW', {families: [fS]}),
          person('N', {primary_parent_family: fS, families: [fU]}),
          person('B', {primary_parent_family: fS}),
          person('K', {primary_parent_family: fU}),
        ])
      })(),
      'K',
    ],
    // M marries the widow W and later her daughter D
    'a man who marries his stepdaughter': [
      (() => {
        const fHW = family('fHW', 'H', 'W', [childRef('D')])
        const fMW = family('fMW', 'M', 'W', [childRef('E')])
        const fMD = family('fMD', 'M', 'D', [childRef('k')])
        return new FamilyGraph([
          person('H', {families: [fHW]}),
          person('W', {families: [fHW, fMW]}),
          person('M', {families: [fMW, fMD]}),
          person('D', {primary_parent_family: fHW, families: [fMD]}),
          person('E', {primary_parent_family: fMW}),
          person('k', {primary_parent_family: fMD}),
        ])
      })(),
      'M',
    ],
  }
  for (const seed of [1, 2, 3]) {
    cases[`a generated tree (${seed})`] = [generatedTree(6, seed), 'P1']
  }

  for (const [name, [tree, root]] of Object.entries(cases)) {
    it(`routes the links of ${name}`, async () => {
      const layout = await layoutRelationships(tree, root)
      expect(layout.links.length).toBeGreaterThan(0)
      expect(routeProblems(layout)).toEqual([])
    })
  }

  it('routes every link of a generated tree', async () => {
    const tree = generatedTree(6, 1)
    const layout = await layoutRelationships(tree, 'P1')
    const edges = relationshipModel(tree).edges
    expect(layout.links).toHaveLength(edges.length)
    expect(edges.length).toBeGreaterThan(50)
  })

  it('brings the links of several parent families to a child side by side', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const ends = layout.links
      .filter(link => link.target.key === 'person:R')
      .map(link => link.points.at(-1)[0])
    expect(ends).toHaveLength(2)
    expect(Math.abs(ends[0] - ends[1])).toBe(20)
  })

  it('shares one bar among the children of a family', async () => {
    const layout = await layoutRelationships(graph, 'R')
    const bars = layout.links
      .filter(link => link.source.key === 'family:fRS')
      .map(link => link.points[1][1])
    expect(new Set(bars).size).toBe(1)
  })
})
