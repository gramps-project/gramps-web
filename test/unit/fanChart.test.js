import {describe, it, expect, vi} from 'vitest'
import {FanChart} from '../../src/charts/FanChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutFan} from '../../src/charts/layout/fanLayout.js'
import {chartPalette, exportPalette} from '../../src/charts/palette.js'
import {chartNameDisplayFormat} from '../../src/util.js'

const family = (handle, father, mother, children) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
})

const person = (handle, surname, {parentFamily = {}, families = []} = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  event_ref_list: [{}, {}],
  primary_name: {surname_list: [{prefix: '', surname}]},
  profile: {
    gramps_id: `I_${handle}`,
    name_given: `Given${handle}`,
    name_surname: surname,
    sex: 'U',
  },
  extended: {primary_parent_family: parentFamily, families},
})

// R has parents F and M, whose parents are not known
const fR = family('fR', 'F', 'M', ['R'])
const graph = new FamilyGraph([
  person('R', 'Smith', {parentFamily: fR}),
  person('F', 'Smith', {families: [fR]}),
  person('M', 'Jones', {families: [fR]}),
])
const layout = layoutFan(graph, 'R', {depth: 3})
const size = {bboxWidth: 800, bboxHeight: 600}

const drawn = (options = {}) => {
  const chart = new FanChart()
  chart.update(layout, {...size, ...options})
  return chart
}

const cells = chart => [...chart.node.querySelectorAll('.fan-cell')]
const texts = chart =>
  [...chart.node.querySelectorAll('#chart-content text')].map(
    text => text.textContent
  )

describe('FanChart', () => {
  it('draws an arc for each known person', () => {
    const chart = drawn()
    expect(cells(chart).map(cell => cell.__data__.key)).toEqual([
      'p',
      'pf',
      'pm',
    ])
    expect(chart.node.querySelector('path#pf')).not.toBeNull()
  })

  it('marks the side of each ancestor with a stripe', () => {
    const stripe = key =>
      cells(drawn())
        .find(cell => cell.__data__.key === key)
        .querySelectorAll('path')[1]
        .getAttribute('fill')
    expect(stripe('pf')).toBe(chartPalette.sex.M)
    expect(stripe('pm')).toBe(chartPalette.sex.F)
  })

  it('writes names in the name display format', () => {
    expect(texts(drawn()).slice(0, 2)).toEqual(['Smith', 'GivenR'])
    expect(
      texts(
        drawn({nameDisplayFormat: chartNameDisplayFormat.givenThenSurname})
      ).slice(0, 2)
    ).toEqual(['GivenR', 'Smith'])
  })

  it('centres the chart in the view', () => {
    // The bounds are a square of 2 × 120 around the root person
    expect(drawn().node.getAttribute('viewBox')).toBe('-400,-300,800,600')
  })

  it('draws the legend of a colour mode in the top left corner', () => {
    const chart = drawn({color: 'surname'})
    const legend = chart.node.querySelector('#legend')
    expect(legend.getAttribute('transform')).toBe('translate(-340, -148)')
    expect(
      [...legend.querySelectorAll('text')].map(text => text.textContent)
    ).toEqual(['Smith', 'Jones'])
    expect(legend.querySelector('text').getAttribute('fill')).toBe(
      chartPalette.legendText
    )
    expect(drawn().node.querySelector('#legend').childElementCount).toBe(0)
  })

  it('takes colours from the palette', () => {
    const chart = drawn({color: 'nEvents', palette: exportPalette})
    expect(chart.node.outerHTML).not.toContain('var(')
  })

  it('selects a person when their arc is clicked', () => {
    const chart = drawn()
    const listener = vi.fn()
    chart.node.addEventListener('pedigree:person-selected', listener)
    cells(chart)[1].dispatchEvent(new MouseEvent('click'))
    expect(listener.mock.calls[0][0].detail).toEqual({grampsId: 'I_F'})
  })

  it('has no click handling or cursor without interactive', () => {
    const chart = drawn({interactive: false})
    const listener = vi.fn()
    chart.node.addEventListener('pedigree:person-selected', listener)
    cells(chart)[1].dispatchEvent(new MouseEvent('click'))
    expect(listener).not.toHaveBeenCalled()
    expect(chart.node.outerHTML).not.toContain('cursor')
  })

  it('draws into the same SVG on every update', () => {
    const chart = drawn()
    const {node} = chart
    chart.update(layout, {...size, color: 'surname'})
    expect(chart.node).toBe(node)
    expect(cells(chart)).toHaveLength(3)
  })

  it('removes the chart and legend on clear', () => {
    const chart = drawn({color: 'surname'})
    chart.clear()
    expect(cells(chart)).toHaveLength(0)
    expect(chart.node.querySelector('#legend').childElementCount).toBe(0)
  })
})
