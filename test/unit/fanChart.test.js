import {describe, it, expect, vi} from 'vitest'
import {select} from 'd3-selection'
import {zoomIdentity, zoomTransform} from 'd3-zoom'
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

  it("widens the father's arc to the circle when he becomes the root person", async () => {
    const chart = drawn()
    const father = cells(chart)[1]
    const arcPath = () => father.querySelector('.fan-arc').getAttribute('d')
    const before = arcPath()
    const [mother] = cells(chart).slice(2)
    chart.update(layoutFan(graph, 'F', {depth: 3}), {...size, duration: 20})
    // The arcs start where they were, and names wait until they stop
    expect(cells(chart)).toEqual([father])
    expect(father.__data__.key).toBe('p')
    expect(arcPath()).toBe(before)
    expect(texts(chart)).toEqual([])
    expect(mother.classList.contains('fan-cell')).toBe(false)
    expect(mother.querySelector('[id]')).toBeNull()
    await vi.waitFor(() => expect(mother.parentNode).toBeNull())
    await vi.waitFor(() => expect(texts(chart)).toEqual(['Smith', 'GivenF']))
    const disc = new FanChart()
    disc.update(layoutFan(graph, 'F', {depth: 3}), size)
    expect(arcPath()).toBe(
      disc.node.querySelector('.fan-arc').getAttribute('d')
    )
  })

  it('narrows the circle to the arc of the child when going back', () => {
    const chart = new FanChart()
    chart.update(layoutFan(graph, 'F', {depth: 3}), size)
    const [father] = cells(chart)
    chart.update(layout, size)
    expect(father.__data__.key).toBe('pf')
    expect(father.querySelector('.fan-arc').getAttribute('d')).toBe(
      drawn().node.querySelector('path#pf').getAttribute('d')
    )
  })

  it('joins the movement with a layout that arrives while the arcs move', async () => {
    // F's father FF is only known once more data arrives
    const fF = family('fF', 'FF', '', ['F'])
    const more = new FamilyGraph([
      person('R', 'Smith', {parentFamily: fR}),
      person('F', 'Smith', {parentFamily: fF, families: [fR]}),
      person('M', 'Jones', {families: [fR]}),
      person('FF', 'Smith', {families: [fF]}),
    ])
    const chart = drawn()
    chart.update(layoutFan(graph, 'F', {depth: 3}), {...size, duration: 40})
    chart.update(layoutFan(more, 'F', {depth: 3}), {...size, duration: 40})
    // FF's arc starts where it would have been in R's chart
    const arcPath = key =>
      cells(chart)
        .find(cell => cell.__data__.key === key)
        .querySelector('.fan-arc')
        .getAttribute('d')
    const ofR = new FanChart()
    ofR.update(layoutFan(more, 'R', {depth: 3}), size)
    expect(arcPath('pf')).toBe(
      ofR.node.querySelector('path#pff').getAttribute('d')
    )
    expect(texts(chart)).toEqual([])
    await vi.waitFor(() =>
      expect(texts(chart)).toEqual(['Smith', 'GivenF', 'Smith', 'GivenFF'])
    )
  })

  it('moves leaving arcs on from where they are when the next movement starts', async () => {
    const chart = drawn()
    const mother = cells(chart)[2]
    // The first point of the arc of M
    const point = () =>
      mother
        .querySelector('.fan-arc')
        .getAttribute('d')
        .match(/-?[\d.]+/g)
        .slice(0, 2)
        .map(Number)
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    const start = point()
    chart.update(layoutFan(graph, 'F', {depth: 3}), {...size, duration: 200})
    await new Promise(resolve => setTimeout(resolve, 100))
    const halfway = point()
    chart.update(layout, {...size, duration: 1000})
    await vi.waitFor(() => expect(point()).not.toEqual(halfway))
    expect(distance(point(), halfway)).toBeLessThan(
      distance(start, halfway) / 2
    )
    chart.clear()
  })

  it('keeps the origin in place when the root person moves to a parent', () => {
    const chart = drawn()
    select(chart.node).call(
      chart.viewport._zoom.transform,
      zoomIdentity.translate(50, 30)
    )
    chart.update(layoutFan(graph, 'F', {depth: 3}), size)
    const {x, y} = zoomTransform(chart.node)
    const [startX, startY] = chart.viewport.viewStart
    // The origin was shown 50, 30 from the centre of the view
    expect([x - startX - 400, y - startY - 300]).toEqual([50, 30])
  })

  it('blends arc colours, and changes CSS variables at the start', async () => {
    const chart = drawn()
    const father = cells(chart)[1].querySelector('.fan-arc')
    const before = father.getAttribute('d')
    chart.update(layoutFan(graph, 'F', {depth: 3}), {...size, duration: 1000})
    await vi.waitFor(() => expect(father.getAttribute('d')).not.toBe(before))
    expect(father.getAttribute('fill')).toBe(chartPalette.fanRoot)
    chart.clear()
  })

  it('goes back into the arc the chart zoomed from', () => {
    // G is the father of both of R's parents
    const fF = family('fF', 'G', '', ['F'])
    const fM = family('fM', 'G', '', ['M'])
    const collapsed = new FamilyGraph([
      person('R', 'Smith', {parentFamily: fR}),
      person('F', 'Smith', {parentFamily: fF, families: [fR]}),
      person('M', 'Jones', {parentFamily: fM, families: [fR]}),
      person('G', 'Smith', {families: [fF, fM]}),
    ])
    const chart = new FanChart()
    chart.update(layoutFan(collapsed, 'R', {depth: 3}), size)
    const viaMother = cells(chart).find(cell => cell.__data__.key === 'pmf')
    viaMother.dispatchEvent(new MouseEvent('click'))
    chart.update(layoutFan(collapsed, 'G', {depth: 3}), size)
    expect(viaMother.__data__.key).toBe('p')
    chart.update(layoutFan(collapsed, 'R', {depth: 3}), size)
    expect(viaMother.__data__.key).toBe('pmf')
  })

  it('does not relate the next layout to a cleared one', () => {
    const chart = drawn()
    chart.clear()
    chart.update(layoutFan(graph, 'F', {depth: 3}), {...size, duration: 1000})
    // Without a movement, names are drawn at once
    expect(texts(chart)).toEqual(['Smith', 'GivenF'])
    chart.clear()
  })

  it('removes the chart and legend on clear', () => {
    const chart = drawn({color: 'surname'})
    chart.clear()
    expect(cells(chart)).toHaveLength(0)
    expect(chart.node.querySelector('#legend').childElementCount).toBe(0)
  })
})
