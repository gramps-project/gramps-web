import {fireEvent} from '../util.js'
import {chartPalette} from './palette.js'

// Appends a circular "+" button to each node in the selection.
// cx, cy: center position relative to the node's origin.
// getHandle(d) must return the person handle for a given datum.
export function appendAddPersonButton(
  nodeSelection,
  cx,
  cy,
  getHandle,
  palette = chartPalette
) {
  const r = 10

  const btn = nodeSelection
    .append('g')
    .attr('class', 'add-person-btn')
    .attr('transform', `translate(${cx}, ${cy})`)
    .style('cursor', 'pointer')
    .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))')
    .on('click', function (event, d) {
      fireEvent(this, 'add-new-person-relation', {handle: getHandle(d)})
      event.stopPropagation()
      event.preventDefault()
    })
    .on('pointerdown', e => e.stopPropagation())

  btn.append('circle').attr('r', r).attr('opacity', 0.9)

  const arm = 4
  // horizontal bar
  btn
    .append('line')
    .attr('x1', -arm)
    .attr('x2', arm)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round')
    .style('pointer-events', 'none')
  // vertical bar
  btn
    .append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', -arm)
    .attr('y2', arm)
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round')
    .style('pointer-events', 'none')

  colorAddPersonButtons(btn, palette)
}

// Colours the circle and plus sign of the buttons in the selection
export function colorAddPersonButtons(buttons, palette = chartPalette) {
  buttons.select('circle').attr('fill', palette.addButton)
  buttons.selectAll('line').attr('stroke', palette.addButtonIcon)
}
