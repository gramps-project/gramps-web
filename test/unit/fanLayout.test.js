import {describe, it, expect} from 'vitest'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {
  invertFrame,
  layoutFan,
  placeArc,
  relateFanLayouts,
} from '../../src/charts/layout/fanLayout.js'

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

describe('relateFanLayouts', () => {
  const ofR = layoutFan(graph, 'R', {depth: 3})
  const ofF = layoutFan(graph, 'F', {depth: 3})
  const node = (layout, key) => layout.nodes.find(n => n.key === key)
  const geometry = ({x0, x1, y0, y1}) => ({x0, x1, y0, y1})
  const expectArc = (arc, expected) =>
    Object.entries(geometry(expected)).forEach(([name, value]) =>
      expect(arc[name]).toBeCloseTo(value)
    )

  it('relates nothing without a previous layout', () => {
    const relation = relateFanLayouts(undefined, ofR)
    expect(relation.key('p')).toBeUndefined()
    expect(relation.kind).toBe('unrelated')
  })

  it('keeps keys and places for the same root person', () => {
    const relation = relateFanLayouts(ofR, layoutFan(graph, 'R', {depth: 4}))
    expect(relation.key('pfm')).toBe('pfm')
    expect(relation.kind).toBe('sameRoot')
    expectArc(placeArc(node(ofR, 'pm'), relation.frame), node(ofR, 'pm'))
  })

  it("widens the father's arc to the circle when he becomes the root person", () => {
    const relation = relateFanLayouts(ofR, ofF)
    expect(relation.kind).toBe('lineage')
    expect(['p', 'pf', 'pff', 'pm', 'pfm'].map(relation.key)).toEqual([
      undefined,
      'p',
      'pf',
      undefined,
      'pm',
    ])
    for (const key of ['pf', 'pff', 'pfm']) {
      expectArc(
        placeArc(node(ofR, key), relation.frame),
        node(ofF, relation.key(key))
      )
    }
  })

  it('narrows the circle to the arc of the child when going back', () => {
    const relation = relateFanLayouts(ofF, ofR)
    expect(relation.kind).toBe('lineage')
    expect(['p', 'pf', 'pmm'].map(relation.key)).toEqual(['pf', 'pff', 'pfmm'])
    for (const key of ['p', 'pf', 'pm']) {
      expectArc(
        placeArc(node(ofF, key), relation.frame),
        node(ofR, relation.key(key))
      )
    }
  })

  it("widens a grandparent's arc to the circle, and narrows it back", () => {
    const ofFF = layoutFan(graph, 'FF', {depth: 3})
    const relation = relateFanLayouts(ofR, ofFF)
    expect(['pf', 'pff', 'pffm'].map(relation.key)).toEqual([
      undefined,
      'p',
      'pm',
    ])
    expectArc(placeArc(node(ofR, 'pff'), relation.frame), node(ofFF, 'p'))
    const back = relateFanLayouts(ofFF, ofR)
    expect(back.key('pm')).toBe('pffm')
    expectArc(placeArc(node(ofFF, 'p'), back.frame), node(ofR, 'pff'))
  })

  describe('an ancestor with several arcs', () => {
    // G is the father of both of R's parents
    const fF = family('fF', 'G', '', ['F'])
    const fM = family('fM', 'G', '', ['M'])
    const collapsed = new FamilyGraph([
      person('R', {parentFamily: fR}),
      person('F', {parentFamily: fF, families: [fR]}),
      person('M', {parentFamily: fM, families: [fR]}),
      person('G', {families: [fF, fM]}),
    ])
    const ofCollapsedR = layoutFan(collapsed, 'R', {depth: 3})
    const ofG = layoutFan(collapsed, 'G', {depth: 3})
    const viaMother = {descendant: 'R', ancestor: 'G', key: 'pmf'}

    it('is related by their arc nearest to the centre', () => {
      const relation = relateFanLayouts(ofCollapsedR, ofG)
      expect(relation.key('pff')).toBe('p')
      expect(relation.lineageArc).toEqual({
        descendant: 'R',
        ancestor: 'G',
        key: 'pff',
      })
    })

    it('is related by the lineage arc of the same two people', () => {
      const relation = relateFanLayouts(ofCollapsedR, ofG, {
        lineageArc: viaMother,
      })
      expect(relation.key('pmf')).toBe('p')
      expect(relation.key('pff')).toBeUndefined()
      expect(relation.lineageArc).toEqual(viaMother)
      const back = relateFanLayouts(ofG, ofCollapsedR, {lineageArc: viaMother})
      expect(back.key('p')).toBe('pmf')
      expect(back.lineageArc).toEqual(viaMother)
    })

    it('ignores a lineage arc of other people', () => {
      const relation = relateFanLayouts(ofCollapsedR, ofG, {
        lineageArc: {...viaMother, descendant: 'F'},
      })
      expect(relation.key('pff')).toBe('p')
    })
  })

  it('relates nothing for unrelated root people', () => {
    const relation = relateFanLayouts(ofF, layoutFan(graph, 'M', {depth: 3}))
    expect(relation.key('p')).toBeUndefined()
    expect(relation.kind).toBe('unrelated')
  })

  it('inverts frames', () => {
    const {frame} = relateFanLayouts(ofR, ofF)
    const arc = node(ofR, 'pff')
    expectArc(placeArc(placeArc(arc, frame), invertFrame(frame)), arc)
  })
})
