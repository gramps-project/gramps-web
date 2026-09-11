import {describe, it, expect} from 'vitest'
import {select} from 'd3-selection'
import {zoom, zoomIdentity, zoomTransform} from 'd3-zoom'
import {TreeChart, viewBoxStart} from '../../src/charts/TreeChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutAncestors} from '../../src/charts/layout/treeLayout.js'
import {chartNameDisplayFormat} from '../../src/util.js'
import {chartPalette} from '../../src/charts/palette.js'

describe('viewBoxStart', () => {
  it('centres a chart that fits the view', () => {
    expect(viewBoxStart(0, -100, 300, 1000)).toBe(-400)
  })

  it('centres the focus when the chart extends past both sides', () => {
    expect(viewBoxStart(0, -1000, 1000, 400)).toBe(-200)
  })

  it('does not scroll before the start of the chart', () => {
    expect(viewBoxStart(0, -115, 1000, 400)).toBe(-115)
  })

  it('does not scroll past the end of the chart', () => {
    expect(viewBoxStart(0, -800, 115, 400)).toBe(-285)
  })

  it('does not jump when a growing chart starts to overflow', () => {
    const fits = viewBoxStart(0, -115, 285, 400)
    const overflows = viewBoxStart(0, -115, 286, 400)
    expect(Math.abs(overflows - fits)).toBeLessThan(1)
  })
})

const family = (handle, father, mother, children) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
})

const person = (handle, {parentFamily = {}, families = []} = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  profile: {
    gramps_id: `I_${handle}`,
    name_given: `Given${handle}`,
    name_surname: `Sur${handle}`,
    sex: 'F',
  },
  extended: {primary_parent_family: parentFamily, families},
})

// R has parents F and M, and F has a mother FM
const fR = family('fR', 'F', 'M', ['R'])
const fF = family('fF', '', 'FM', ['F'])
const graph = new FamilyGraph([
  person('R', {parentFamily: fR}),
  person('F', {parentFamily: fF, families: [fR]}),
  person('M', {families: [fR]}),
  person('FM', {families: [fF]}),
])

const size = {bboxWidth: 800, bboxHeight: 600}

const nodeWithKey = (chart, key) =>
  [...chart.node.querySelectorAll('.person-node')].find(
    node => node.__data__.key === key
  )

const firstText = (chart, key) => nodeWithKey(chart, key).querySelector('text')

describe('TreeChart', () => {
  it('draws people without link elements, which the app styles underline', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    expect(chart.node.querySelectorAll('.person-node')).toHaveLength(4)
    expect(chart.node.querySelectorAll('a')).toHaveLength(0)
  })

  it('keeps nodes and cards when only the container size changes', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    const node = nodeWithKey(chart, 'pf')
    const text = firstText(chart, 'pf')
    chart.update(layout, {...size, bboxWidth: 400})
    expect(nodeWithKey(chart, 'pf')).toBe(node)
    expect(firstText(chart, 'pf')).toBe(text)
    expect(chart.node.getAttribute('viewBox').split(',')[2]).toBe('400')
  })

  it('toggles edit mode without redrawing cards', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    const text = firstText(chart, 'p')
    const buttons = () => chart.node.querySelectorAll('.add-person-btn')
    chart.update(layout, {...size, canEdit: true})
    expect(buttons()).toHaveLength(4)
    chart.update(layout, size)
    expect(buttons()).toHaveLength(0)
    expect(firstText(chart, 'p')).toBe(text)
  })

  it('redraws a card when its person or the name format changes', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    const kept = firstText(chart, 'p')
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    expect(firstText(chart, 'p').textContent).toBe('SurF,')
    expect(firstText(chart, 'p')).not.toBe(kept)
    expect(chart.node.querySelectorAll('.person-node')).toHaveLength(2)
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), {
      ...size,
      nameDisplayFormat: chartNameDisplayFormat.givenThenSurname,
    })
    expect(firstText(chart, 'p').textContent).toBe('GivenF')
  })

  it('shows the children triangle on the requested side', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    const triangle = () => chart.node.querySelector('#triangle-children')
    chart.update(layout, {...size, childrenTriangle: true})
    expect(triangle().getAttribute('transform')).toBe(
      'translate(-107,0) rotate(-90) scale(-1, 0.5)'
    )
    const element = triangle()
    chart.update(layout, {...size, childrenTriangle: true, orientation: 'RTL'})
    expect(triangle()).toBe(element)
    expect(triangle().getAttribute('transform')).toBe(
      'translate(107,0) rotate(90) scale(-1, 0.5)'
    )
    chart.update(layout, size)
    expect(triangle()).toBeNull()
  })

  it('keeps the zoom for the same root and only the zoom level for a new one', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    select(chart.node).call(
      zoom().transform,
      zoomIdentity.translate(40, 30).scale(2)
    )
    chart.update(layoutAncestors(graph, 'R', {depth: 2}), size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 2, x: 40, y: 30})
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 2, x: 0, y: 0})
    expect(
      chart.node.querySelector('#chart-content').getAttribute('transform')
    ).toBe('translate(0,0) scale(2)')
  })

  it('leaves out buttons, triangle, shadows and clicks when not interactive', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, {...size, canEdit: true, childrenTriangle: true})
    const root = nodeWithKey(chart, 'p')
    expect(root.style.filter).toContain('drop-shadow')
    chart.update(layout, {...size, childrenTriangle: true, interactive: false})
    expect(
      chart.node.querySelectorAll('.add-person-btn, #triangle-children')
    ).toHaveLength(0)
    expect(root.style.filter).toBe('')
    expect(root.style.cursor).toBe('')
    const selected = []
    root.addEventListener('pedigree:person-selected', e =>
      selected.push(e.detail)
    )
    root.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    expect(selected).toEqual([])
  })

  it('takes link, triangle and card colours from the palette', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    const palette = {
      ...chartPalette,
      link: 'grey',
      triangle: 'blue',
      personBox: 'white',
    }
    const box = () => nodeWithKey(chart, 'p').querySelectorAll('rect')[1]
    chart.update(layout, {...size, childrenTriangle: true, palette})
    expect(
      chart.node.querySelector('path').parentNode.getAttribute('stroke')
    ).toBe('grey')
    expect(
      chart.node.querySelector('#triangle-children').getAttribute('fill')
    ).toBe('blue')
    expect(box().getAttribute('fill')).toBe('white')
    chart.update(layout, {...size, palette: {...palette, personBox: 'ivory'}})
    expect(box().getAttribute('fill')).toBe('ivory')
  })

  it('clears people and links but keeps the zoom', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    select(chart.node).call(zoom().transform, zoomIdentity.translate(5, 5))
    chart.clear()
    expect(chart.node.querySelectorAll('.person-node, path')).toHaveLength(0)
    chart.update(layout, size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 1, x: 5, y: 5})
  })
})
