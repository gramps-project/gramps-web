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

const click = node =>
  node.dispatchEvent(new MouseEvent('click', {bubbles: true}))

describe('RelationshipChart', () => {
  it('draws a card for every person node and highlights the root person', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const people = [...chart.node.querySelectorAll('.node.person')]
    expect(people.map(node => node.__data__.key).sort()).toEqual([
      'fA:A1',
      'fA:A2',
      'fFM:F',
      'fFM:M',
      'fRS:R',
      'fRS:S',
      'fRT:R',
      'fRT:T',
      'p_K:K',
      'p_L:L',
    ])
    expect(
      people.filter(node => node.style.filter).map(node => node.__data__.key)
    ).toEqual(['fRS:R', 'fRT:R'])
    expect(people.every(node => node.querySelector('text'))).toBe(true)
  })

  it('links adopted children with dashes', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const dashed = [...chart.node.querySelectorAll('path.link')].filter(path =>
      path.getAttribute('stroke-dasharray')
    )
    expect(dashed.map(path => path.__data__.source.key)).toEqual([
      'family:fA',
      'family:fA',
    ])
  })

  it('starts the links of a family at its marker', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'R'), size)
    const marker = nodeWithKey(chart, 'family:fRT')
    const [x, y] = translateOf(marker)
    const ring = marker.querySelector('circle.married')
    const [cx, cy] = ['cx', 'cy'].map(name => Number(ring.getAttribute(name)))
    const link = [...chart.node.querySelectorAll('path.link')].find(
      path => path.__data__.source.key === 'family:fRT'
    )
    const [, startX, startY] = /^M([^,]+),([^C]+)/.exec(link.getAttribute('d'))
    expectClose([Number(startX), Number(startY)], [x + cx, y + cy])
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
    const [, leftEnd] = edges('fRT:R')
    const [rightStart] = edges('fRT:T')
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
    const node = nodeWithKey(chart, 'fRT:T')
    const text = node.querySelector('text')
    chart.update(layout, {...size, bboxWidth: 2000})
    expect(nodeWithKey(chart, 'fRT:T')).toBe(node)
    expect(node.querySelector('text')).toBe(text)
  })

  it('keeps the clicked node of a person with several families in place', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'F'), size)
    const before = viewPosition(chart, 'fRT:R')
    click(nodeWithKey(chart, 'fRT:R'))
    chart.update(await layoutRelationships(graph, 'R'), size)
    expectClose(viewPosition(chart, 'fRT:R'), before)
  })

  it('keeps the first visible node of a new root person in place', async () => {
    const chart = new RelationshipChart()
    chart.update(await layoutRelationships(graph, 'F'), size)
    const before = viewPosition(chart, 'fRS:R')
    chart.update(await layoutRelationships(graph, 'R'), size)
    expectClose(viewPosition(chart, 'fRS:R'), before)
  })

  it('keeps the root person in place when new data puts them in a family', async () => {
    const chart = new RelationshipChart()
    // Without S, T and their children, R is not drawn in any couple
    const withoutPartners = new FamilyGraph(
      graph.people().filter(p => !['S', 'T', 'K', 'L'].includes(p.handle))
    )
    chart.update(await layoutRelationships(withoutPartners, 'R'), size)
    const before = viewPosition(chart, 'p_R:R')
    chart.update(await layoutRelationships(graph, 'R'), size)
    expect(nodeWithKey(chart, 'p_R:R')).toBeUndefined()
    expectClose(viewPosition(chart, 'fRS:R'), before)
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
    const root = nodeWithKey(chart, 'fRS:R')
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
