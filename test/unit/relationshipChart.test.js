import {describe, it, expect, vi} from 'vitest'
import {RelationshipChart} from '../../src/charts/RelationshipChart.js'

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

// R is the birth child of F and M and the adopted child of A1 and A2, and has
// K with S, who is not married to R
const fFM = family('fFM', 'F', 'M', [childRef('R')])
const fA = family('fA', 'A1', 'A2', [childRef('R', 'Adopted', 'Adopted')])
const fRS = family('fRS', 'R', 'S', [childRef('K')], 'Unknown')
const people = [
  person('R', {
    primary_parent_family: fFM,
    parent_families: [fFM, fA],
    families: [fRS],
  }),
  person('F', {families: [fFM]}),
  person('M', {families: [fFM]}),
  person('A1', {families: [fA]}),
  person('A2', {families: [fA]}),
  person('S', {families: [fRS]}),
  person('K', {primary_parent_family: fRS}),
]

async function renderChart() {
  const svg = RelationshipChart(people, {
    grampsId: 'I_R',
    bboxWidth: 800,
    bboxHeight: 600,
  })
  await vi.waitFor(
    () => expect(svg.querySelector('g.node.person')).not.toBeNull(),
    {timeout: 5000}
  )
  return svg
}

describe('RelationshipChart', () => {
  it('draws a card for every person and highlights the root person', async () => {
    const svg = await renderChart()
    const nodes = [...svg.querySelectorAll('g.node.person')]
    expect(nodes.map(node => node.__data__.handle).sort()).toEqual([
      'A1',
      'A2',
      'F',
      'K',
      'M',
      'R',
      'S',
    ])
    expect(
      nodes.filter(node => node.style.filter).map(node => node.__data__.handle)
    ).toEqual(['R'])
    expect(nodes.every(node => node.querySelector('text'))).toBe(true)
  })

  it('links adopted children with dashes', async () => {
    const svg = await renderChart()
    const dashed = [...svg.querySelectorAll('path.edge')].filter(path =>
      path.getAttribute('stroke-dasharray')
    )
    expect(dashed.map(path => path.__data__.source.key)).toEqual(['family:fA'])
    expect(svg.querySelectorAll('path.edge')).toHaveLength(3)
  })

  it('marks married couples', async () => {
    const svg = await renderChart()
    const markers = [...svg.querySelectorAll('g.node.family')].filter(node =>
      node.querySelector('circle.married')
    )
    expect(markers.map(node => node.__data__.key).sort()).toEqual([
      'family:fA',
      'family:fFM',
    ])
  })
})
