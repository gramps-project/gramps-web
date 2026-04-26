import {fireEvent} from '../util.js'

// Appends a circular "+" button to each node in the selection.
// getHandle(d) must return the person handle for a given datum.
export function appendAddPersonButton(nodeSelection, cx, cy, getHandle) {
  nodeSelection
    .append('circle')
    .attr('class', 'add-person-btn')
    .attr('r', 13)
    .attr('cx', cx)
    .attr('cy', cy)
    .style('fill', '#FFFFFF')
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      fireEvent(this, 'add-new-person-relation', {handle: getHandle(d)})
      event.stopPropagation()
      event.preventDefault()
    })

  nodeSelection
    .append('text')
    .attr('class', 'add-person-text')
    .attr('x', cx)
    .attr('y', cy + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('fill', 'black')
    .style('pointer-events', 'none')
    .text('+')
}
