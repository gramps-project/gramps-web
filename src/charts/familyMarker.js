import {chartPalette} from './palette.js'

// Appends a marker for the family of each node in the selection, on the line
// between the cards of the two partners, which are `boxHeight` pixels high. A
// married couple gets a ring on a short line; other families have no marker.
export function appendFamilyMarker(
  nodes,
  {boxHeight = 90, palette = chartPalette} = {}
) {
  const y = boxHeight / 2 - 10
  const married = nodes.filter(d => d.family?.type === 'Married')
  married
    .append('line')
    .attr('x1', -11)
    .attr('x2', 11)
    .attr('y1', y)
    .attr('y2', y)
    .attr('stroke', palette.familyMarker)
    .attr('stroke-width', 1)
  married
    .append('circle')
    .attr('class', 'married')
    .attr('r', 6)
    .attr('cy', y)
    .attr('stroke', palette.familyMarker)
    .attr('fill', palette.familyMarkerFill)
}
