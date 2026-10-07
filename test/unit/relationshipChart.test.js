import {describe, it, expect} from 'vitest'
import {select} from 'd3-selection'
import {zoomTransform} from 'd3-zoom'
import {RelationshipChart} from '../../src/charts/RelationshipChart.js'
import {layoutRelationships} from '../../src/charts/layout/relationshipLayout.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const childRef = (ref, frel = 'Birth', mrel = 'Birth') => ({ref, frel, mrel})

const family = (handle, father, mother, children, type = 'Married') => ({
  handle,
  type,
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
// K with S, who is not married to R, and L with T.
const fFM = family('fFM', 'F', 'M', [childRef('R')])
const fA = family('fA', 'A1', 'A2', [childRef('R', 'Adopted', 'Adopted')])
const fRS = family('fRS', 'R', 'S', [childRef('K')], 'Unknown')
const fRT = family('fRT', 'R', 'T', [childRef('L')])
const graph = new FamilyGraph([
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
  person('T', {families: [fRT]}),
  person('K', {primary_parent_family: fRS}),
  person('L', {primary_parent_family: fRT}),
])

const size = {bboxWidth: 3000, bboxHeight: 2000}

const nodeWithKey = (chart, key) =>
  [...chart.node.querySelectorAll('.node')].find(
    node => node.__data__.key === key
  )

const translateOf = node => {
  const [, x, y] = /translate\(([^,]+),([^)]+)\)/.exec(
    node.getAttribute('transform')
  )
  return [Number(x), Number(y)]
}

// Position of a node relative to the top left corner of the view
const viewPosition = (chart, key) => {
  const [x, y] = zoomTransform(chart.node).apply(
    translateOf(nodeWithKey(chart, key))
  )
  const [left, top] = chart.node.getAttribute('viewBox').split(',').map(Number)
  return [x - left, y - top]
}

const expectClose = (actual, expected) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]))

// Returns the point each command of an SVG path ends at
const pathPoints = d => {
  const points = []
  for (const [, command, args] of d.matchAll(/([MLQHV])([^MLQHV]*)/g)) {
    const numbers = args
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    const [x, y] = points.at(-1) ?? [0, 0]
    if (command === 'H') {
      points.push([numbers[0], y])
    } else if (command === 'V') {
      points.push([x, numbers[0]])
    } else {
      points.push(numbers.slice(-2))
    }
  }
  return points
}

const click = node =>
  node.dispatchEvent(new MouseEvent('click', {bubbles: true}))

describe('RelationshipChart', () => {
  it('draws a card for every person node and highlights the root person', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const people = [...chart.node.querySelectorAll('.node.person')]
    expect(people.map(node => node.__data__.key).sort()).toEqual([
      'person:A1',
      'person:A2',
      'person:F',
      'person:K',
      'person:L',
      'person:M',
      'person:R',
      'person:S',
      'person:T',
    ])
    expect(
      people.filter(node => node.style.filter).map(node => node.__data__.key)
    ).toEqual(['person:R'])
    expect(people.every(node => node.querySelector('text'))).toBe(true)
  })

  it('links adopted children with dashes', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const dashed = [...chart.node.querySelectorAll('path.link')].filter(path =>
      path.getAttribute('stroke-dasharray')
    )
    // R is the only child of A1 and A2, so their whole trunk is dashed too
    expect(
      dashed.map(path => [path.__data__.kind, path.__data__.source.key]).sort()
    ).toEqual([
      ['child', 'family:fA'],
      ['trunk', 'family:fA'],
    ])
  })

  it('starts the trunk of a family at its marker', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const marker = nodeWithKey(chart, 'family:fRT')
    const [x, y] = translateOf(marker)
    const ring = marker.querySelector('circle.married')
    const [cx, cy] = ['cx', 'cy'].map(name => Number(ring.getAttribute(name)))
    const link = [...chart.node.querySelectorAll('path.link')].find(
      path => path.__data__.key === 'trunk:family:fRT'
    )
    expectClose(pathPoints(link.getAttribute('d'))[0], [x + cx, y + cy])
  })

  it('centres the family marker in the gap between the partner cards', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    // The visible edges of a card are its colour stripe and its box
    const edges = key => {
      const node = nodeWithKey(chart, key)
      const [x] = translateOf(node)
      const [stripe, box] = node.querySelectorAll('.person-card > rect')
      return [
        x + Number(stripe.getAttribute('x')),
        x + Number(box.getAttribute('x')) + Number(box.getAttribute('width')),
      ]
    }
    const [, leftEnd] = edges('person:R')
    const [rightStart] = edges('person:T')
    const marker = nodeWithKey(chart, 'family:fRT')
    const cx = Number(marker.querySelector('circle.married').getAttribute('cx'))
    expect(translateOf(marker)[0] + cx).toBeCloseTo((leftEnd + rightStart) / 2)
  })

  it('marks married couples', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const married = [...chart.node.querySelectorAll('.node.family')]
      .filter(node => node.querySelector('circle.married'))
      .map(node => node.__data__.key)
    expect(married.sort()).toEqual(['family:fA', 'family:fFM', 'family:fRT'])
  })

  it('keeps nodes and cards when only the container size changes', async () => {
    const chart = new RelationshipChart()
    const layout = await layoutRelationships(graph, 'R')
    chart.update(layout, size)
    const node = nodeWithKey(chart, 'person:T')
    const text = node.querySelector('text')
    chart.update(layout, {...size, bboxWidth: 2000})
    expect(nodeWithKey(chart, 'person:T')).toBe(node)
    expect(node.querySelector('text')).toBe(text)
  })

  it('keeps the clicked person in place', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'F'), size)
    const before = viewPosition(chart, 'person:T')
    click(nodeWithKey(chart, 'person:T'))
    chart.update(await layoutRelationships(graph, 'T'), size)
    expectClose(viewPosition(chart, 'person:T'), before)
  })

  it('keeps a new root person in place', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'F'), size)
    const before = viewPosition(chart, 'person:R')
    chart.update(await layoutRelationships(graph, 'R'), size)
    expectClose(viewPosition(chart, 'person:R'), before)
  })

  it('keeps the root person in place when new data puts them in a family', async () => {
    const chart = new RelationshipChart()
    // Without S, T and their children, R is not drawn in any couple
    const withoutPartners = new FamilyGraph(
      graph.people().filter(p => !['S', 'T', 'K', 'L'].includes(p.handle))
    )
    chart.update(await layoutRelationships(withoutPartners, 'R'), size)
    const node = nodeWithKey(chart, 'person:R')
    const before = viewPosition(chart, 'person:R')
    chart.update(await layoutRelationships(graph, 'R'), size)
    expect(nodeWithKey(chart, 'person:R')).toBe(node)
    expectClose(viewPosition(chart, 'person:R'), before)
  })

  it('joins partners who are not next to each other with a bracket', async () => {
    const fRW = family('fRW', 'R', 'W', [childRef('N')])
    const more = new FamilyGraph([
      ...graph.people().filter(p => p.handle !== 'R'),
      person('R', {
        primary_parent_family: fFM,
        parent_families: [fFM, fA],
        families: [fRS, fRT, fRW],
      }),
      person('W', {families: [fRW]}),
      person('N', {primary_parent_family: fRW}),
    ])
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(more, 'R'), size)
    const brackets = [...chart.node.querySelectorAll('path.bracket')]
    expect(brackets.map(path => path.parentNode.__data__.key)).toEqual([
      'family:fRW',
    ])
    const marker = nodeWithKey(chart, 'family:fRW')
    const [x, y] = translateOf(marker)
    const ring = marker.querySelector('circle.married')
    const [cx, cy] = ['cx', 'cy'].map(name => Number(ring.getAttribute(name)))
    const link = [...chart.node.querySelectorAll('path.link')].find(
      path => path.__data__.key === 'trunk:family:fRW'
    )
    expectClose(pathPoints(link.getAttribute('d'))[0], [x + cx, y + cy])
    expect(brackets[0].getAttribute('d')).toContain(`V${cy}`)
  })

  it('draws an arch to a child in the same row as the parents', async () => {
    // M marries the widow W and later her daughter D
    const fHW = family('fHW', 'H', 'W', [childRef('D')])
    const fMW = family('fMW', 'M', 'W', [])
    const fMD = family('fMD', 'M', 'D', [])
    const chart = new RelationshipChart()
    chart.update(
      await layoutRelationships(
        new FamilyGraph([
          person('H', {families: [fHW]}),
          person('W', {families: [fHW, fMW]}),
          person('M', {families: [fMW, fMD]}),
          person('D', {primary_parent_family: fHW, families: [fMD]}),
        ]),
        'M'
      ),
      size
    )
    const link = [...chart.node.querySelectorAll('path.link')].find(
      path => path.__data__.source.key === 'family:fHW'
    )
    const [d] = translateOf(nodeWithKey(chart, 'person:D'))
    const [h] = translateOf(nodeWithKey(chart, 'person:H'))
    expect(d).toBeGreaterThan(h)
    // Up from the marker, across above the cards and down into D's card
    const points = pathPoints(link.getAttribute('d'))
    expect(points[0][1]).toBeCloseTo(35)
    expect(Math.min(...points.map(([, y]) => y))).toBeCloseTo(-65)
    expectClose(points.at(-1), [d, -45])
  })

  it('keeps one link from a single parent of several families', async () => {
    // C is in two families of M whose fathers are not fetched
    const fA = family('fA', 'X', 'M', [childRef('C')])
    const fB = family('fB', 'Y', 'M', [childRef('C', 'Stepchild', 'Birth')])
    const single = new FamilyGraph([
      person('M', {families: [fA, fB]}),
      person('C', {primary_parent_family: fA, parent_families: [fA, fB]}),
    ])
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(single, 'M'), size)
    const branches = () =>
      [...chart.node.querySelectorAll('path.link')].filter(
        path => path.__data__.kind === 'child'
      )
    const [link, ...others] = branches()
    expect(others).toHaveLength(0)
    expect(link.getAttribute('stroke-dasharray')).toBeNull()
    chart.update(await layoutRelationships(single, 'C'), {
      ...size,
      duration: 100,
    })
    expect(branches()).toHaveLength(1)
    select(chart.node).selectAll('*').interrupt()
  })

  it('fades the links of a new layout in while the old ones fade out', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const before = [...chart.node.querySelectorAll('path.link')]
    chart.update(await layoutRelationships(graph, 'K'), {
      ...size,
      duration: 100,
    })
    const after = [...chart.node.querySelectorAll('path.link')]
    expect(after.length).toBe(before.length)
    expect(after.some(path => before.includes(path))).toBe(false)
    // The old links stay until they have faded out
    expect(before.every(path => path.parentNode !== null)).toBe(true)
    expect(after.every(path => path.style.opacity === '0')).toBe(true)
    select(chart.node).selectAll('*').interrupt()
  })

  it('dashes only the lines that lead to adopted children alone', async () => {
    // F and M have a birth child B and an adopted child A
    const fFM = family('fFM', 'F', 'M', [
      childRef('B'),
      childRef('A', 'Adopted', 'Adopted'),
    ])
    const chart = new RelationshipChart()
    chart.update(
      await layoutRelationships(
        new FamilyGraph([
          person('F', {families: [fFM]}),
          person('M', {families: [fFM]}),
          person('B', {primary_parent_family: fFM}),
          person('A', {primary_parent_family: fFM}),
        ]),
        'F'
      ),
      size
    )
    const paths = [...chart.node.querySelectorAll('path.link')]
    const kinds = paths.map(path => path.__data__.kind).sort()
    expect(kinds).toEqual(['child', 'child', 'trunk'])
    const trunk = paths.find(path => path.__data__.kind === 'trunk')
    expect(trunk.getAttribute('stroke-dasharray')).toBeNull()
    // The stem and the bar towards B are solid, short of the rounded corner
    // down to B
    const [[stemX], , [left, barY], [right]] = pathPoints(
      trunk.getAttribute('d')
    )
    const childX = key => translateOf(nodeWithKey(chart, key))[0]
    const [a, b] = [childX('person:A'), childX('person:B')]
    expectClose([left, right], b < a ? [b + 8, stemX] : [stemX, b - 8])
    // The dashed line to A starts at the stem, runs along the bar and turns
    // down
    const adopted = paths.find(path => path.__data__.target?.key === 'person:A')
    expect(adopted.getAttribute('stroke-dasharray')).not.toBeNull()
    expect(adopted.getAttribute('d')).toContain('Q')
    const [start] = pathPoints(adopted.getAttribute('d'))
    expectClose(start, [stemX, barY])
  })

  it('dashes the bar beyond the last birth child on a side', async () => {
    // B is a birth child; A and C are adopted, A beyond B
    const fFM = family('fFM', 'F', 'M', [
      childRef('B'),
      childRef('A', 'Adopted', 'Adopted'),
      childRef('C', 'Adopted', 'Adopted'),
    ])
    const layout = await layoutRelationships(
      new FamilyGraph([
        person('F', {families: [fFM]}),
        person('M', {families: [fFM]}),
        person('B', {primary_parent_family: fFM}),
        person('A', {primary_parent_family: fFM}),
        person('C', {primary_parent_family: fFM}),
      ]),
      'F'
    )
    // Children at 100, 200 and 300 to the right of the stem: B, C, A
    const stemX = layout.links[0].points[0][0]
    const offsets = {'person:B': 100, 'person:C': 200, 'person:A': 300}
    for (const link of layout.links) {
      const x = stemX + offsets[link.target.key]
      link.points = [
        ...link.points.slice(0, 2),
        [x, link.points[1][1]],
        [x, link.points.at(-1)[1]],
      ]
    }
    const chart = new RelationshipChart()
    chart.update(layout, size)
    const paths = [...chart.node.querySelectorAll('path.link')]
    const of = key => paths.find(path => path.__data__.target?.key === key)
    const trunk = paths.find(path => path.__data__.kind === 'trunk')
    expect(trunk.getAttribute('stroke-dasharray')).toBeNull()
    // The solid bar ends at B, A's dashed line runs from there and C's
    // drops from it
    const barRight = pathPoints(trunk.getAttribute('d')).at(-1)[0]
    expect(barRight).toBeCloseTo(stemX + 100)
    expect(pathPoints(of('person:A').getAttribute('d'))[0][0]).toBeCloseTo(
      stemX + 100
    )
    expect(pathPoints(of('person:C').getAttribute('d'))[0][0]).toBeCloseTo(
      stemX + 200
    )
  })

  it('keeps the stem square where it turns into the bar above a child', async () => {
    // F and M have a child straight below them and another to one side
    const fFM = family('fFM', 'F', 'M', [childRef('C'), childRef('D')])
    const layout = await layoutRelationships(
      new FamilyGraph([
        person('F', {families: [fFM]}),
        person('M', {families: [fFM]}),
        person('C', {primary_parent_family: fFM}),
        person('D', {primary_parent_family: fFM}),
      ]),
      'C'
    )
    // The bar runs from the stem to D only
    const stemX = layout.links[0].points[0][0]
    for (const link of layout.links) {
      link.points[2][0] = link.target.key === 'person:C' ? stemX : stemX + 300
      link.points[3][0] = link.points[2][0]
      link.points.at(-1)[0] = link.points[2][0]
    }
    const chart = new RelationshipChart()
    chart.update(layout, size)
    const trunk = [...chart.node.querySelectorAll('path.link')].find(
      path => path.__data__.kind === 'trunk'
    )
    const [start, corner] = pathPoints(trunk.getAttribute('d'))
    expect(corner[0]).toBeCloseTo(start[0])
    expect(trunk.getAttribute('d')).not.toContain('Q')
  })

  it('meets the bar square where the stem and a child line up', async () => {
    // F and M have one child, straight below the family
    const fFM = family('fFM', 'F', 'M', [childRef('C')])
    const chart = new RelationshipChart()
    chart.update(
      await layoutRelationships(
        new FamilyGraph([
          person('F', {families: [fFM]}),
          person('M', {families: [fFM]}),
          person('C', {primary_parent_family: fFM}),
        ]),
        'C'
      ),
      size
    )
    for (const path of chart.node.querySelectorAll('path.link')) {
      expect(path.getAttribute('d')).not.toContain('Q')
    }
  })

  it('fits the whole chart into the view when asked', async () => {
    const chart = new RelationshipChart()
    const layout = await layoutRelationships(graph, 'R')
    chart.update(layout, {bboxWidth: 300, bboxHeight: 200, fit: true})
    expect(zoomTransform(chart.node).k).toBeLessThan(1)
    for (const node of chart.node.querySelectorAll('.node')) {
      const [x, y] = viewPosition(chart, node.__data__.key)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(300)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(200)
    }
  })

  it('leaves out shadows and clicks when not interactive', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), {
      ...size,
      interactive: false,
    })
    const root = nodeWithKey(chart, 'person:R')
    expect(root.style.filter).toBe('')
    const selected = []
    root.addEventListener('pedigree:person-selected', e =>
      selected.push(e.detail)
    )
    click(root)
    expect(selected).toEqual([])
    select(chart.node).selectAll('*').interrupt()
  })
})
