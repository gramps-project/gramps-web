import {select} from 'd3-selection'
import {
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
} from '@mdi/js'

// The chevron buttons of the charts. Their radius, in pixels.
export const buttonRadius = 20
// Radius of the backdrop around the chevron, in pixels
const backdropRadius = 12

const chevrons = {
  left: mdiChevronLeft,
  right: mdiChevronRight,
  top: mdiChevronUp,
  bottom: mdiChevronDown,
}

// Appends buttons to the `enter` selection that call `activate(event, d)`
// when clicked or on Enter or Space. A button is a chevron in a round area of
// `buttonRadius` that is shaded while the pointer is on it or it has focus.
// With `backdrop`, a disc in the background colour fades lines that run under
// the chevron.
export function enterChartButtons(enter, activate, {backdrop = true} = {}) {
  function onActivate(e, d) {
    activate.call(this, e, d)
    e.stopPropagation()
    e.preventDefault()
  }
  function shade() {
    select(this)
      .select('.shade')
      .attr('fill-opacity', this.matches(':hover, :focus') ? 1 : 0)
  }
  const button = enter
    .append('g')
    .attr('role', 'button')
    .attr('tabindex', 0)
    .style('cursor', 'pointer')
    .on('click', onActivate)
    .on('keydown', function (e, d) {
      if (e.key === 'Enter' || e.key === ' ') {
        onActivate.call(this, e, d)
      }
    })
    .on('mouseenter mouseleave focus blur', shade)
  if (backdrop) {
    button
      .append('circle')
      .attr('class', 'backdrop')
      .attr('r', backdropRadius)
      .attr('fill-opacity', 0.8)
  }
  button
    .append('circle')
    .attr('class', 'shade')
    .attr('r', buttonRadius)
    .attr('fill-opacity', 0)
  // The 24px icon is centred on the button
  button.append('path').attr('transform', 'translate(-12,-12)')
  return button
}

// Colours the buttons from `palette` and points the chevron of each to
// `side(d)`: 'left', 'right', 'top' or 'bottom'
export function styleChartButtons(buttons, palette, side) {
  buttons.select('.backdrop').attr('fill', palette.background)
  buttons.select('.shade').attr('fill', palette.triangleHover)
  buttons
    .select('path')
    .attr('d', d => chevrons[side(d)])
    .attr('fill', palette.triangle)
}
