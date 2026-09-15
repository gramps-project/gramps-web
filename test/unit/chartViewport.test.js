import {describe, it, expect} from 'vitest'
import {create} from 'd3-selection'
import {zoomIdentity, zoomTransform} from 'd3-zoom'
import {ChartViewport, viewBoxStart} from '../../src/charts/ChartViewport.js'

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

const size = [800, 600]
const small = {xMin: -100, xMax: 100, yMin: -50, yMax: 50}
const large = {xMin: -2000, xMax: 500, yMin: -300, yMax: 1500}

function viewport() {
  const svg = create('svg')
  const content = svg.append('g')
  return {svg, viewport: new ChartViewport(svg, content)}
}

// Position of a layout point relative to the top left corner of the view
function viewPosition(svg, point) {
  const [x, y] = zoomTransform(svg.node()).apply(point)
  const [left, top] = svg.attr('viewBox').split(',').map(Number)
  return [x - left, y - top]
}

// Pans the view by `dx` and `dy` pixels
function pan(svg, dx, dy) {
  const {x, y, k} = zoomTransform(svg.node())
  svg.node().__zoom = zoomIdentity.translate(x + dx, y + dy).scale(k)
}

const expectClose = (actual, expected) =>
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]))

describe('ChartViewport', () => {
  it('keeps the zoom transform when the same layout is shown again', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: small, size, rootHandle: 'R'})
    pan(svg, 30, -20)
    const transform = zoomTransform(svg.node())
    const {offset} = view.show({
      bounds: small,
      size: [700, 600],
      rootHandle: 'R',
    })
    expect(zoomTransform(svg.node())).toBe(transform)
    expectClose(offset, [-50, 0])
  })

  it('keeps the root person in place in a new layout with the same root', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: small, size, rootHandle: 'R'})
    pan(svg, 30, -20)
    const before = viewPosition(svg, [0, 0])
    const {offset} = view.show({
      bounds: large,
      size,
      rootHandle: 'R',
      newLayout: true,
    })
    expectClose(viewPosition(svg, [0, 0]), before)
    expectClose(offset, [0, 0])
  })

  it('keeps a visible candidate of a new root person in place', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    const before = viewPosition(svg, [200, 100])
    const {offset, keptKey} = view.show({
      bounds: large,
      size,
      rootHandle: 'B',
      candidates: [{key: 'b', position: [0, 0]}],
      positions: new Map([['b', [200, 100]]]),
      newLayout: true,
    })
    expect(keptKey).toBe('b')
    expectClose(viewPosition(svg, [0, 0]), before)
    // The previous position of the candidate, shifted by the offset, is its
    // new position
    expectClose([200 - offset[0], 100 - offset[1]], [0, 0])
  })

  it('prefers the clicked candidate', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    const before = viewPosition(svg, [-100, 50])
    view.rememberClick('B', 'b2')
    const {keptKey} = view.show({
      bounds: large,
      size,
      rootHandle: 'B',
      candidates: [
        {key: 'b1', position: [0, 0]},
        {key: 'b2', position: [300, 0]},
      ],
      positions: new Map([
        ['b1', [100, 50]],
        ['b2', [-100, 50]],
      ]),
      newLayout: true,
    })
    expect(keptKey).toBe('b2')
    expectClose(viewPosition(svg, [300, 0]), before)
  })

  it('starts at the default position when no candidate was visible', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    pan(svg, 30, -20)
    const {keptKey} = view.show({
      bounds: large,
      size,
      rootHandle: 'B',
      candidates: [{key: 'b', position: [0, 0]}],
      positions: new Map([['b', [5000, 0]]]),
      newLayout: true,
    })
    expect(keptKey).toBeUndefined()
    const {x, y, k} = zoomTransform(svg.node())
    expect([x, y, k]).toEqual([0, 0, 1])
  })

  it('fits a new chart into the view', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A', fit: true})
    expect(zoomTransform(svg.node()).k).toBeLessThan(1)
    for (const corner of [
      [large.xMin, large.yMin],
      [large.xMax, large.yMax],
    ]) {
      const [x, y] = viewPosition(svg, corner)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(size[0])
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(size[1])
    }
  })

  it('does not count a layout shown before the view has a size', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: small, size: [-1, -1], rootHandle: 'A', fit: true})
    expect(zoomTransform(svg.node()).k).toBe(1)
    view.show({bounds: large, size, rootHandle: 'A', fit: true})
    expect(zoomTransform(svg.node()).k).toBeLessThan(1)
  })

  it('zooms around the centre of the view', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    pan(svg, 30, -20)
    const {k} = zoomTransform(svg.node())
    const centre = zoomTransform(svg.node()).invert([
      ...svg
        .attr('viewBox')
        .split(',')
        .map(Number)
        .slice(0, 2)
        .map((start, i) => start + size[i] / 2),
    ])
    view.zoomBy(2)
    expect(zoomTransform(svg.node()).k).toBeCloseTo(2 * k)
    expectClose(viewPosition(svg, centre), [size[0] / 2, size[1] / 2])
  })

  it('moves the chart by a number of pixels', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    const [x, y] = viewPosition(svg, [0, 0])
    view.panBy(-100, 40)
    expectClose(viewPosition(svg, [0, 0]), [x - 100, y + 40])
  })

  it('fits the chart after the view was moved', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A', fit: true})
    const fitted = zoomTransform(svg.node())
    view.zoomBy(3)
    view.panBy(250, 250)
    view.fit()
    const {x, y, k} = zoomTransform(svg.node())
    expectClose([x, y, k], [fitted.x, fitted.y, fitted.k])
  })

  it('centres the root person at the current zoom level', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size, rootHandle: 'A'})
    view.zoomBy(0.5)
    view.panBy(300, -120)
    view.centreRoot()
    expect(zoomTransform(svg.node()).k).toBeCloseTo(0.5)
    expectClose(viewPosition(svg, [0, 0]), [size[0] / 2, size[1] / 2])
  })

  it('does not change the view before it has a size', () => {
    const {svg, viewport: view} = viewport()
    view.show({bounds: large, size: [-1, -1], rootHandle: 'A'})
    view.zoomBy(2)
    view.panBy(10, 10)
    view.fit()
    const {x, y, k} = zoomTransform(svg.node())
    expect([x, y, k]).toEqual([0, 0, 1])
  })
})
