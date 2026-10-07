import {describe, it, expect} from 'vitest'
import {create} from 'd3-selection'
// Transitions come from d3-transition, which d3-zoom loads
import 'd3-zoom'
import {transitionColor} from '../../src/charts/animatedJoin.js'

// Returns the value of the fill tween of a rect filled with `from` at `t` of
// the way to `to`
const fillAt = (from, to, t) => {
  const rect = create('svg').append('rect').attr('fill', from)
  const transition = rect.transition()
  transitionColor(transition, 'fill', () => to)
  return transition.attrTween('fill').call(rect.node(), undefined)(t)
}

describe('transitionColor', () => {
  it('blends colours', () => {
    expect(fillAt('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)')
  })

  it('changes CSS variables at the start', () => {
    const variable = 'var(--grampsjs-color-shade-120)'
    expect(fillAt('#1f78b4', variable, 0.5)).toBe(variable)
    expect(fillAt(variable, '#1f78b4', 0.5)).toBe('#1f78b4')
  })
})
