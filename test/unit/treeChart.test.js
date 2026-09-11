import {describe, it, expect} from 'vitest'
import {viewBoxStart} from '../../src/charts/TreeChart.js'

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
