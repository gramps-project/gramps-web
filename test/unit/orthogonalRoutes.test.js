import {describe, it, expect} from 'vitest'
import {
  assignTracks,
  gapMargin,
  routeLinks,
  trackSpacing,
} from '../../src/charts/layout/orthogonalRoutes.js'

const span = (left, right, extra = {}) => ({left, right, ...extra})

describe('assignTracks', () => {
  it('puts spans that are apart on one track', () => {
    const spans = [span(0, 10), span(10 + trackSpacing, 50)]
    expect(assignTracks(spans)).toBe(1)
    expect(spans.map(s => s.track)).toEqual([0, 0])
  })

  it('puts overlapping and close spans on different tracks', () => {
    const spans = [
      span(0, 100),
      span(50, 150),
      span(100 + trackSpacing - 1, 200),
    ]
    expect(assignTracks(spans)).toBe(3)
    expect(new Set(spans.map(s => s.track)).size).toBe(3)
  })

  it('uses as few tracks as the most spans over one point', () => {
    // At most two spans overlap anywhere
    const spans = [
      span(0, 100),
      span(50, 200),
      span(120, 300),
      span(220, 400),
      span(320, 500),
    ]
    expect(assignTracks(spans)).toBe(2)
  })

  it('puts a span above the spans in its below', () => {
    const lower = span(0, 100)
    const upper = span(50, 150, {below: [lower]})
    expect(assignTracks([lower, upper])).toBe(2)
    expect(upper.track).toBeLessThan(lower.track)
  })

  it('gives spans that would each have to lie above the other a track each', () => {
    const a = span(0, 100)
    const b = span(50, 150, {below: [a]})
    a.below = [b]
    expect(assignTracks([a, b])).toBe(2)
  })
})

// Rows of cards 90 pixels high whose centres are 200 pixels apart, with
// 110 pixels between them
const rows = [0, 200, 400].map(y => ({top: y - 45, bottom: y + 45}))

// A link from (x0, row r0) down to (x1, row r0 + 1)
const link = (owner, x0, x1, r0 = 0) => ({
  owner,
  start: {row: r0, x: x0, y: rows[r0].bottom},
  end: {row: r0 + 1, x: x1, y: rows[r0 + 1].top},
  legs: [{gap: r0, from: x0, to: x1}],
})

describe('routeLinks', () => {
  it('routes a link down, across and down', () => {
    const {routes, shifts} = routeLinks(rows, [link('f', 0, 300)])
    expect(shifts).toEqual([0, 0, 0])
    expect(routes).toEqual([
      [
        [0, 45],
        [0, 100],
        [300, 100],
        [300, 155],
      ],
    ])
  })

  it('draws the links of one owner along one bar', () => {
    const {routes} = routeLinks(rows, [
      link('f', 0, -300),
      link('f', 0, 300),
      link('f', 0, 0),
    ])
    expect(new Set(routes.map(route => route[1][1])).size).toBe(1)
  })

  it('puts the bars of families that overlap at different heights', () => {
    const {routes} = routeLinks(rows, [link('f', 0, 400), link('g', 200, -200)])
    const [f, g] = routes.map(route => route[1][1])
    expect(Math.abs(f - g)).toBe(trackSpacing)
  })

  it('ends a line from above higher than a line going down at the same x', () => {
    // f's stem comes down at 200, where g's child is
    for (const order of [
      ['f', 'g'],
      ['g', 'f'],
    ]) {
      const links = {f: link('f', 200, 600), g: link('g', -100, 200)}
      const {routes} = routeLinks(
        rows,
        order.map(key => links[key])
      )
      const [f, g] = ['f', 'g'].map(key => routes[order.indexOf(key)][1][1])
      expect(f).toBeLessThan(g)
    }
  })

  it('moves rows down to make room for many bars', () => {
    const many = Array.from({length: 12}, (_, i) => link(`f${i}`, i, 1000 - i))
    const {routes, shifts} = routeLinks(rows, many)
    const needed = 2 * gapMargin + 11 * trackSpacing
    expect(shifts).toEqual([0, needed - 110, needed - 110])
    const heights = routes.map(route => route[1][1]).sort((a, b) => a - b)
    expect(heights[0]).toBe(45 + gapMargin)
    expect(heights.at(-1)).toBe(155 + shifts[1] - gapMargin)
    // The ends move with their rows
    for (const route of routes) {
      expect(route.at(-1)[1]).toBe(155 + shifts[1])
    }
  })

  it('goes through a row between the gaps on either side of it', () => {
    const skip = {
      owner: 'f',
      start: {row: 0, x: 0, y: 45},
      end: {row: 2, x: 500, y: 355},
      legs: [
        {gap: 0, from: 0, to: 250},
        {gap: 1, from: 250, to: 500},
      ],
    }
    const [route] = routeLinks(rows, [skip]).routes
    expect(route).toEqual([
      [0, 45],
      [0, 100],
      [250, 100],
      [250, 300],
      [500, 300],
      [500, 355],
    ])
  })

  it('moves a line through a row aside from the end of another link', () => {
    // f goes through row 1 at 250, where g's child is
    const skip = {
      owner: 'f',
      start: {row: 0, x: 0, y: 45},
      end: {row: 2, x: 500, y: 355},
      legs: [
        {gap: 0, from: 0, to: 250},
        {gap: 1, from: 250, to: 500},
      ],
    }
    const [route] = routeLinks(rows, [skip, link('g', 100, 250, 1)]).routes
    expect(Math.abs(route[2][0] - 250)).toBeGreaterThanOrEqual(5)
    expect(route[3][0]).toBe(route[2][0])
    expect(route[4][0]).toBe(500)
  })

  it('straightens a link through rows that have room for it', () => {
    // Graphviz crossed row 1 at 250; the row has room above the end
    const skip = {
      owner: 'f',
      start: {row: 0, x: 0, y: 45},
      end: {row: 2, x: 500, y: 355},
      legs: [
        {gap: 0, from: 0, to: 250},
        {gap: 1, from: 250, to: 500},
      ],
    }
    const free = rows.map(row => ({...row, blocked: [[-1000, -200]]}))
    const [route] = routeLinks(free, [skip]).routes
    expect(route).toEqual([
      [0, 45],
      [0, 100],
      [500, 100],
      [500, 300],
      [500, 300],
      [500, 355],
    ])
    // Without room above the end, the line goes on below the start
    const blocked = rows.map(row => ({...row, blocked: [[400, 600]]}))
    const [other] = routeLinks(blocked, [skip]).routes
    expect(other.map(([x]) => x)).toEqual([0, 0, 0, 0, 500, 500])
  })

  it('routes above the first row and back down', () => {
    // A link from row 1 up to row 0, around the right of row 1
    const up = {
      owner: 'f',
      start: {row: 1, x: 0, y: 245},
      end: {row: 0, x: 100, y: -45},
      legs: [
        {gap: 1, from: 0, to: 300},
        {gap: 0, from: 300, to: 320},
        {gap: -1, from: 320, to: 100},
      ],
    }
    const [route] = routeLinks(rows, [up]).routes
    // Between rows 1 and 2 the line runs in the middle of the gap
    expect(route.map(([, y]) => y)).toEqual([
      245,
      300,
      300,
      100,
      100,
      -45 - gapMargin,
      -45 - gapMargin,
      -45,
    ])
  })
})
