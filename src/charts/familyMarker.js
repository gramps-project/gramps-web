import {chartPalette} from './palette.js'

// Returns the position of a family's marker relative to its family node, for
// partner cards that are `boxHeight` pixels high. The colour stripe of a card
// reaches 4 pixels past its left edge, so the gap between the two partners is
// centred 2 pixels left of the family node.
export const familyMarkerPosition = boxHeight => [-2, boxHeight / 2 - 10]

// Appends a marker for the family of each node in the selection, in the gap
// between the cards of the two partners, which are `boxHeight` pixels high. A
// married couple gets a ring on a short line; other families have no marker.
export function appendFamilyMarker(
  nodes,
  {boxHeight = 90, palette = chartPalette} = {}
) {
  const [x, y] = familyMarkerPosition(boxHeight)
  const married = nodes.filter(d => d.family?.type === 'Married')
  married
    .append('line')
    .attr('x1', x - 11)
    .attr('x2', x + 11)
    .attr('y1', y)
    .attr('y2', y)
    .attr('stroke', palette.familyMarker)
    .attr('stroke-width', 1)
  married
    .append('circle')
    .attr('class', 'married')
    .attr('r', 6)
    .attr('cx', x)
    .attr('cy', y)
    .attr('stroke', palette.familyMarker)
    .attr('fill', palette.familyMarkerFill)
}
