import {describe, expect, it} from 'vitest'
import {FanChart} from '../../src/charts/FanChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutFan} from '../../src/charts/layout/fanLayout.js'

function fullFanGraph(depth) {
  const people = []
  const add = (handle, generation) => {
    const parentFamily =
      generation < depth - 1
        ? {
            handle: `f${handle}`,
            father_handle: `${handle}f`,
            mother_handle: `${handle}m`,
            child_ref_list: [{ref: handle, frel: 'Birth', mrel: 'Birth'}],
          }
        : {}
    people.push({
      handle,
      gramps_id: handle,
      profile: {name_surname: 'Cottrell', name_given: 'Alexandra'},
      extended: {primary_parent_family: parentFamily, families: []},
    })
    if (generation < depth - 1) {
      add(`${handle}f`, generation + 1)
      add(`${handle}m`, generation + 1)
    }
  }
  add('p', 0)
  return new FamilyGraph(people)
}

const drawn = (graph, arcRadius = 60) => {
  const chart = new FanChart()
  chart.update(layoutFan(graph, 'p', {depth: 8, arcRadius}), {
    bboxWidth: 800,
    bboxHeight: 600,
  })
  return chart.node
}

const cell = (svg, id) => svg.querySelector(`path[id="${id}"]`).parentNode

describe('fan chart labels', () => {
  const graph = fullFanGraph(8)

  it('keeps curved names on wide arcs and rotates narrow outer names radially', () => {
    const svg = drawn(graph)
    const wide = cell(svg, 'pf')
    const narrow = cell(svg, 'pffffff')
    expect(wide.querySelectorAll('textPath')).toHaveLength(2)
    expect(wide.querySelector('.radial-label')).toBeNull()
    expect(narrow.querySelectorAll('textPath')).toHaveLength(0)
    const label = narrow.querySelector('.radial-label')
    expect(label.textContent.length).toBeGreaterThan(0)
    expect(Number(label.getAttribute('font-size'))).toBeLessThanOrEqual(8)
    expect(label.getAttribute('transform')).toMatch(
      /translate\(.+\) rotate\(.+\)/
    )
  })

  it('fits the radial name inside the ring and inner edge of its slice', () => {
    const svg = drawn(graph)
    const label = cell(svg, 'pffffff').querySelector('.radial-label')
    expect(label.textContent).toMatch(/…$/)
    for (const text of svg.querySelectorAll('.radial-label')) {
      const level = text.parentNode.querySelector('path[id]').id.length - 1
      const fontSize = Number(text.getAttribute('font-size'))
      expect(fontSize + 2).toBeLessThanOrEqual(
        (level * 60 * 2 * Math.PI) / 2 ** level
      )
      expect(text.textContent.length * fontSize * 0.7).toBeLessThanOrEqual(50)
    }
  })

  it('fits more of a name in wider rings without changing the default layout', () => {
    const normal = drawn(graph)
    const wide = drawn(graph, 90)
    const normalLabel = cell(normal, 'pfffffff').querySelector('.radial-label')
    const wideLabel = cell(wide, 'pfffffff').querySelector('.radial-label')
    expect(wideLabel.textContent.length).toBeGreaterThan(
      normalLabel.textContent.length
    )
    expect(cell(normal, 'pf').querySelector('path').getAttribute('d')).toBe(
      cell(drawn(graph, 60), 'pf').querySelector('path').getAttribute('d')
    )
  })
})
