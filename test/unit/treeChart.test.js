import {describe, it, expect, vi} from 'vitest'
import {select} from 'd3-selection'
import {zoom, zoomIdentity, zoomTransform} from 'd3-zoom'
import {TreeChart} from '../../src/charts/TreeChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {
  layoutAncestors,
  layoutDescendants,
} from '../../src/charts/layout/treeLayout.js'
import {chartNameDisplayFormat} from '../../src/util.js'
import {chartPalette} from '../../src/charts/palette.js'
import {
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
} from '@mdi/js'

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
const people = () => [
  person('R', {parentFamily: fR}),
  person('F', {parentFamily: fF, families: [fR]}),
  person('M', {families: [fR]}),
  person('FM', {families: [fF]}),
]
const graph = new FamilyGraph(people())

// FM is also the mother of M, so she appears twice among R's ancestors
const fM = family('fM', '', 'FM', ['M'])
const collapsed = new FamilyGraph([
  person('R', {parentFamily: fR}),
  person('F', {parentFamily: fF, families: [fR]}),
  person('M', {parentFamily: fM, families: [fR]}),
  person('FM', {families: [fF, fM]}),
])

const size = {bboxWidth: 800, bboxHeight: 600}

const nodeWithKey = (chart, key) =>
  [...chart.node.querySelectorAll('.person-node')].find(
    node => node.__data__.key === key
  )

const firstText = (chart, key) => nodeWithKey(chart, key).querySelector('text')

const translateOf = node => {
  const [, x, y] = /translate\(([^,]+),([^)]+)\)/.exec(
    node.getAttribute('transform')
  )
  return [Number(x), Number(y)]
}

// Position of a person node relative to the top left corner of the view
const viewPosition = (chart, key) => {
  const [x, y] = zoomTransform(chart.node).apply(
    translateOf(nodeWithKey(chart, key))
  )
  const [left, top] = chart.node.getAttribute('viewBox').split(',').map(Number)
  return [x - left, y - top]
}

const expectClose = (actual, expected) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]))

const setZoom = (chart, transform) =>
  select(chart.node).call(zoom().transform, transform)

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

  it('keeps the node and card of a person who becomes the root', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    const node = nodeWithKey(chart, 'pf')
    const text = firstText(chart, 'pf')
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    expect(nodeWithKey(chart, 'p')).toBe(node)
    expect(firstText(chart, 'p')).toBe(text)
    expect(chart.node.querySelectorAll('.person-node')).toHaveLength(2)
  })

  it('redraws cards when the data or the name format changes', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    const text = firstText(chart, 'p')
    const refetched = new FamilyGraph(people())
    chart.update(layoutAncestors(refetched, 'R', {depth: 3}), size)
    expect(firstText(chart, 'p')).not.toBe(text)
    expect(firstText(chart, 'p').textContent).toBe('SurR,')
    chart.update(layoutAncestors(refetched, 'R', {depth: 3}), {
      ...size,
      nameDisplayFormat: chartNameDisplayFormat.givenThenSurname,
    })
    expect(firstText(chart, 'p').textContent).toBe('GivenR')
  })

  it('shows the children triangle on the requested side', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    const triangle = () => chart.node.querySelector('#triangle-children')
    const shape = () => triangle().querySelector('path')
    chart.update(layout, {...size, childrenTriangle: true})
    // 8px from the colour stripe on the left and from the box on the right
    expect(triangle().getAttribute('transform')).toBe('translate(-127,0)')
    expect(shape().getAttribute('d')).toBe(mdiChevronLeft)
    const element = triangle()
    chart.update(layout, {...size, childrenTriangle: true, menuSide: 'right'})
    expect(triangle()).toBe(element)
    expect(triangle().getAttribute('transform')).toBe('translate(123,0)')
    expect(shape().getAttribute('d')).toBe(mdiChevronRight)
    // 8px from the box above and below
    chart.update(layout, {...size, childrenTriangle: true, menuSide: 'bottom'})
    expect(triangle().getAttribute('transform')).toBe('translate(0,73)')
    expect(shape().getAttribute('d')).toBe(mdiChevronDown)
    chart.update(layout, {...size, childrenTriangle: true, menuSide: 'top'})
    expect(triangle().getAttribute('transform')).toBe('translate(0,-73)')
    expect(shape().getAttribute('d')).toBe(mdiChevronUp)
    chart.update(layout, size)
    expect(triangle()).toBeNull()
  })

  it('shows the whole menu button in a view narrower than the chart', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), {
      bboxWidth: 360,
      bboxHeight: 600,
      childrenTriangle: true,
    })
    const [x] = translateOf(chart.node.querySelector('#triangle-children'))
    const [left] = zoomTransform(chart.node).apply([x - 20, 0])
    const [viewBoxLeft] = chart.node
      .getAttribute('viewBox')
      .split(',')
      .map(Number)
    expect(left - viewBoxLeft).toBeGreaterThanOrEqual(0)
  })

  it('opens the menu of relatives by click or keyboard from a labelled triangle', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, {
      ...size,
      childrenTriangle: true,
      triangleLabel: 'Children',
    })
    const triangle = chart.node.querySelector('#triangle-children')
    expect(triangle.getAttribute('role')).toBe('button')
    expect(triangle.getAttribute('tabindex')).toBe('0')
    expect(triangle.getAttribute('aria-label')).toBe('Children')
    expect(Number(triangle.querySelector('circle').getAttribute('r'))).toBe(20)
    let opened = 0
    chart.node.addEventListener('pedigree:show-children', () => {
      opened += 1
    })
    triangle.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    triangle.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})
    )
    triangle.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'a', bubbles: true})
    )
    expect(opened).toBe(2)
  })

  it('keeps the same root person in place in a new layout', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    setZoom(chart, zoomIdentity.translate(40, 30).scale(2))
    const before = viewPosition(chart, 'p')
    const viewBox = chart.node.getAttribute('viewBox')
    chart.update(layoutAncestors(graph, 'R', {depth: 2}), size)
    expect(chart.node.getAttribute('viewBox')).not.toBe(viewBox)
    expectClose(viewPosition(chart, 'p'), before)
    expect(zoomTransform(chart.node).k).toBe(2)
  })

  it('keeps the zoom transform when only the size changes', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    setZoom(chart, zoomIdentity.translate(40, 30).scale(2))
    chart.update(layout, {...size, bboxWidth: 500})
    expect(zoomTransform(chart.node)).toMatchObject({k: 2, x: 40, y: 30})
  })

  it('keeps a new root person who was on screen at their place in the view', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    setZoom(chart, zoomIdentity.translate(40, 30).scale(2))
    const before = viewPosition(chart, 'pf')
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    expectClose(viewPosition(chart, 'p'), before)
    expect(zoomTransform(chart.node).k).toBe(2)
  })

  it('starts a new root person who was off screen or absent at the default position', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    setZoom(chart, zoomIdentity.translate(-2000, 0).scale(2))
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 2, x: 0, y: 0})
    setZoom(chart, zoomIdentity.translate(10, 10).scale(2))
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 2, x: 0, y: 0})
    expect(
      chart.node.querySelector('#chart-content').getAttribute('transform')
    ).toBe('translate(0,0) scale(2)')
  })

  it('keeps the clicked node in place when the person appears more than once', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(collapsed, 'R', {depth: 3}), size)
    const first = viewPosition(chart, 'pfm')
    const clicked = viewPosition(chart, 'pmm')
    expect(clicked).not.toEqual(first)
    nodeWithKey(chart, 'pmm').dispatchEvent(
      new MouseEvent('click', {bubbles: true})
    )
    chart.update(layoutAncestors(collapsed, 'FM', {depth: 3}), size)
    expectClose(viewPosition(chart, 'p'), clicked)
  })

  it('judges whether a new root person was on screen by the previous view size', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 3}), size)
    setZoom(chart, zoomIdentity.translate(40, 30).scale(2))
    const before = viewPosition(chart, 'pf')
    expect(before[0]).toBeGreaterThan(500)
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), {
      ...size,
      bboxWidth: 500,
    })
    expectClose(viewPosition(chart, 'p'), before)
  })

  it('starts the clicked copy of a duplicated person in place when animated', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(collapsed, 'R', {depth: 3}), size)
    const clicked = nodeWithKey(chart, 'pmm')
    const before = viewPosition(chart, 'pmm')
    clicked.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    chart.update(layoutAncestors(collapsed, 'FM', {depth: 3}), {
      ...size,
      duration: 1000,
    })
    expect(nodeWithKey(chart, 'p')).toBe(clicked)
    expectClose(viewPosition(chart, 'p'), before)
    select(chart.node).selectAll('*').interrupt().interrupt('fade')
  })

  it('keeps the first visible copy of a duplicated person in place without a click', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(collapsed, 'R', {depth: 3}), size)
    // The first copy of FM is above the view, the second one is in it
    setZoom(chart, zoomIdentity.translate(0, -300))
    expect(viewPosition(chart, 'pfm')[1]).toBeLessThan(0)
    const second = nodeWithKey(chart, 'pmm')
    const before = viewPosition(chart, 'pmm')
    chart.update(layoutAncestors(collapsed, 'FM', {depth: 3}), size)
    expect(nodeWithKey(chart, 'p')).toBe(second)
    expectClose(viewPosition(chart, 'p'), before)
  })

  it('does not remember clicks when not interactive', () => {
    const chart = new TreeChart()
    const options = {...size, interactive: false}
    chart.update(layoutAncestors(collapsed, 'R', {depth: 3}), options)
    const first = viewPosition(chart, 'pfm')
    nodeWithKey(chart, 'pmm').dispatchEvent(
      new MouseEvent('click', {bubbles: true})
    )
    chart.update(layoutAncestors(collapsed, 'FM', {depth: 3}), options)
    expectClose(viewPosition(chart, 'p'), first)
  })

  it.each([
    ['the same root person with wider bounds', 'R', 2, 'R', 3, 'p', 'p'],
    ['a new root person who was on screen', 'R', 3, 'F', 3, 'pf', 'p'],
    ['a new root person who was not in the chart', 'F', 3, 'R', 3, 'p', 'pf'],
  ])(
    'starts animating people from where they are on screen for %s',
    (name, fromRoot, fromDepth, toRoot, toDepth, fromKey, toKey) => {
      const chart = new TreeChart()
      chart.update(layoutAncestors(graph, fromRoot, {depth: fromDepth}), size)
      setZoom(chart, zoomIdentity.translate(40, 30).scale(2))
      const before = viewPosition(chart, fromKey)
      chart.update(layoutAncestors(graph, toRoot, {depth: toDepth}), {
        ...size,
        duration: 1000,
      })
      expectClose(viewPosition(chart, toKey), before)
      select(chart.node).selectAll('*').interrupt().interrupt('fade')
    }
  )

  it('moves people to their new places and fades people in and out', async () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), size)
    const father = nodeWithKey(chart, 'p')

    // F becomes R's father: R is not in F's chart, so nobody is kept in place
    const target = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(target, {...size, duration: 20})
    const child = nodeWithKey(chart, 'p')
    expect(child.style.opacity).toBe('0')
    const end = target.nodes.find(node => node.key === 'pf')
    expect([end.x, end.y]).not.toEqual([0, 0])
    await vi.waitFor(() => expectClose(translateOf(father), [end.x, end.y]))
    await vi.waitFor(() => expect(child.style.opacity).toBe(''))

    // Back to F: M leaves the chart
    const mother = nodeWithKey(chart, 'pm')
    chart.update(layoutAncestors(graph, 'F', {depth: 3}), {
      ...size,
      duration: 20,
    })
    expect(mother.classList.contains('person-node')).toBe(false)
    expect(mother.style.getPropertyValue('pointer-events')).toBe('none')
    await vi.waitFor(() => expect(mother.parentNode).toBeNull())
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
      chart.node.querySelector('#triangle-children path').getAttribute('fill')
    ).toBe('blue')
    expect(box().getAttribute('fill')).toBe('white')
    chart.update(layout, {...size, palette: {...palette, personBox: 'ivory'}})
    expect(box().getAttribute('fill')).toBe('ivory')
  })

  it('draws links at right angles, rounded where they turn to outer people', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    const paths = new Map(
      [...chart.node.querySelectorAll('path.link')].map(path => [
        path.__data__.target.handle,
        path.getAttribute('d'),
      ])
    )
    expect([...paths.keys()].sort()).toEqual(['F', 'FM', 'M'])
    for (const d of paths.values()) {
      // Straight lines and rounded corners only
      expect(d).toMatch(/^M[-\d.,MHVLQ ]+$/)
    }
    // R's parents lie above and below R; FM lies straight across from F
    expect(paths.get('F')).toMatch(/Q/)
    expect(paths.get('M')).toMatch(/Q/)
    expect(paths.get('FM')).not.toMatch(/Q/)
  })

  it('draws each part of the lines that links share once', () => {
    // P has the children A, B and C
    const fP = family('fP', 'P', '', ['A', 'B', 'C'])
    const parent = new FamilyGraph([
      person('P', {families: [fP]}),
      ...['A', 'B', 'C'].map(handle => person(handle, {parentFamily: fP})),
    ])
    const chart = new TreeChart()
    chart.update(layoutDescendants(parent, 'P', {depth: 2}), size)
    const paths = new Map(
      [...chart.node.querySelectorAll('path.link')].map(path => [
        path.__data__.target.handle,
        path.getAttribute('d'),
      ])
    )
    const start = handle => /^M([^,]+)/.exec(paths.get(handle))[1]
    // Only the link to the top child, A, draws the stem from P's card; the
    // others start at the bar
    expect(start('B')).toBe(start('C'))
    expect(start('A')).not.toBe(start('B'))
    // The outer links draw the bar, rounded into their child, and the link
    // to the middle child only the line from the bar
    expect(paths.get('A')).toMatch(/Q/)
    expect(paths.get('C')).toMatch(/Q/)
    expect(paths.get('B')).toMatch(/^M[^A-Z]+L[^A-Z]+$/)
  })

  it('dashes the lines that lead to children who are not birth children only', () => {
    // P adopted A and has the birth children B, C and D; A and B lie above
    // P, C and D below
    const fP = {
      handle: 'fP',
      father_handle: 'P',
      mother_handle: '',
      child_ref_list: [
        {ref: 'A', frel: 'Adopted', mrel: 'Birth'},
        ...['B', 'C', 'D'].map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
      ],
    }
    const parent = new FamilyGraph([
      person('P', {families: [fP]}),
      ...['A', 'B', 'C', 'D'].map(handle => person(handle, {parentFamily: fP})),
    ])
    const chart = new TreeChart()
    chart.update(layoutDescendants(parent, 'P', {depth: 2}), size)
    const links = new Map(
      [...chart.node.querySelectorAll('path.link')].map(path => [
        path.__data__.target.handle,
        path,
      ])
    )
    const dashed = handle =>
      links.get(handle).getAttribute('stroke-dasharray') !== null
    expect(['A', 'B', 'C', 'D'].map(dashed)).toEqual([
      true,
      false,
      false,
      false,
    ])
    // B draws the bar from the stem, and A only the part beyond B
    const y = handle => links.get(handle).__data__.target.y
    const start = handle =>
      /^M[^,]+,([^A-Z]+)/.exec(links.get(handle).getAttribute('d'))[1]
    expect(Number(start('A'))).toBeCloseTo(y('B'))
  })

  it('dashes the line to an adoptive parent in an ancestor chart', () => {
    // R is the adopted child of F and the birth child of M
    const fAdopted = {
      ...fR,
      child_ref_list: [{ref: 'R', frel: 'Adopted', mrel: 'Birth'}],
    }
    const adopted = new FamilyGraph([
      person('R', {parentFamily: fAdopted}),
      person('F', {families: [fAdopted]}),
      person('M', {families: [fAdopted]}),
    ])
    const chart = new TreeChart()
    chart.update(layoutAncestors(adopted, 'R', {depth: 2}), size)
    const dashes = Object.fromEntries(
      [...chart.node.querySelectorAll('path.link')].map(path => [
        path.__data__.target.handle,
        path.getAttribute('stroke-dasharray'),
      ])
    )
    expect(dashes).toEqual({F: '6 4', M: null})
  })

  it('draws links between rows in a vertical chart', () => {
    const chart = new TreeChart()
    chart.update(layoutAncestors(graph, 'R', {depth: 2, vertical: true}), size)
    const paths = Object.fromEntries(
      [...chart.node.querySelectorAll('path.link')].map(path => [
        path.__data__.target.handle,
        path.getAttribute('d'),
      ])
    )
    // The stem goes up from 10px inside R's card to the middle of the gap,
    // where the bar to F and M runs
    expect(paths.F).toMatch(/^M0,-35L0,-65L/)
    expect(paths.M).toMatch(/^M0,-65L/)
  })

  it('fades the links when the chart turns between columns and rows', () => {
    const chart = new TreeChart()
    const links = () => [...chart.node.querySelectorAll('path.link')]
    chart.update(layoutAncestors(graph, 'R', {depth: 2}), size)
    const columns = links()
    chart.update(layoutAncestors(graph, 'R', {depth: 2, vertical: true}), {
      ...size,
      duration: 100,
    })
    const rows = links().filter(path => !columns.includes(path))
    expect(rows).toHaveLength(2)
    expect(rows.every(path => path.style.opacity === '0')).toBe(true)
    // A new layout in rows moves the same links
    chart.update(layoutAncestors(graph, 'R', {depth: 2, vertical: true}), {
      ...size,
      duration: 100,
    })
    expect(links().filter(path => rows.includes(path))).toHaveLength(2)
    select(chart.node).selectAll('*').interrupt()
  })

  it('clears people and links but keeps the zoom', () => {
    const chart = new TreeChart()
    const layout = layoutAncestors(graph, 'R', {depth: 3})
    chart.update(layout, size)
    setZoom(chart, zoomIdentity.translate(5, 5))
    chart.clear()
    expect(chart.node.querySelectorAll('.person-node, path')).toHaveLength(0)
    chart.update(layout, size)
    expect(zoomTransform(chart.node)).toMatchObject({k: 1, x: 5, y: 5})
  })
})
