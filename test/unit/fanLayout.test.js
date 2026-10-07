import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutFan} from '../../src/charts/layout/fanLayout.js'

const family = (handle, father, mother, children) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
})

const person = (handle, {parentFamily = {}, families = []} = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  profile: {gramps_id: `I_${handle}`, sex: 'U'},
  extended: {primary_parent_family: parentFamily, families},
})

// R has parents F and M, and F has a father FF. M's parents are not known.
const fR = family('fR', 'F', 'M', ['R'])
const fF = family('fF', 'FF', '', ['F'])
const graph = new FamilyGraph([
  person('R', {parentFamily: fR}),
  person('F', {parentFamily: fF, families: [fR]}),
  person('M', {families: [fR]}),
  person('FF', {families: [fF]}),
])

describe('layoutFan', () => {
  const layout = layoutFan(graph, 'R', {depth: 3})
  const node = key => layout.nodes.find(n => n.key === key)

  it('has a node for every place in the fan, known or not', () => {
    expect(
      layout.nodes.map(({key, handle, generation, side}) => ({
        key,
        handle,
        generation,
        side,
      }))
    ).toEqual([
      {key: 'p', handle: 'R', generation: 0, side: ''},
      {key: 'pf', handle: 'F', generation: 1, side: 'father'},
      {key: 'pm', handle: 'M', generation: 1, side: 'mother'},
      {key: 'pff', handle: 'FF', generation: 2, side: 'father'},
      {key: 'pfm', handle: undefined, generation: 2, side: 'mother'},
      {key: 'pmf', handle: undefined, generation: 2, side: 'father'},
      {key: 'pmm', handle: undefined, generation: 2, side: 'mother'},
    ])
    expect(node('pfm').person).toEqual({})
  })

  it('places the root person in a disc and each generation in a ring', () => {
    expect(node('p')).toMatchObject({x0: 0, x1: 2 * Math.PI, y0: 0, y1: 60})
    expect(node('pf')).toMatchObject({x0: 0, x1: Math.PI, y0: 60, y1: 120})
    expect(node('pm')).toMatchObject({x0: Math.PI, x1: 2 * Math.PI})
    expect(node('pff')).toMatchObject({x0: 0, x1: Math.PI / 2, y0: 120})
  })

  it('bounds the root disc and the arcs of known people', () => {
    // FF's arc in the upper left reaches the outer radius 180, while the
    // lower half only has the parents' ring of radius 120
    const {xMin, xMax, yMin, yMax} = layout.bounds
    expect(xMin).toBeCloseTo(-180)
    expect(yMin).toBeCloseTo(-180)
    expect(xMax).toBeCloseTo(120)
    expect(yMax).toBeCloseTo(120)
  })

  it('bounds a person without known parents by their disc', () => {
    const alone = layoutFan(graph, 'FF', {depth: 4})
    expect(alone.bounds).toEqual({xMin: -60, xMax: 60, yMin: -60, yMax: 60})
  })
})
