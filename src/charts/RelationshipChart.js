import {linkVertical} from 'd3-shape'
import {ChartCanvas, place} from './ChartCanvas.js'
import {appendFamilyMarker, familyMarkerPosition} from './familyMarker.js'
import {relationshipLayoutDefaults} from './layout/relationshipLayout.js'

const {boxWidth, boxHeight} = relationshipLayoutDefaults

// A link runs from the marker of a family, or the bottom of a single
// parent's card, to the top of the child's card. It is drawn as a curve, or,
// when the child is not below its start, as an arch over the row that ends
// `archHeight` pixels above the child.
const curve = linkVertical()
const markerPosition = familyMarkerPosition(boxHeight)
const archHeight = 20

// Draws layouts from `layoutRelationships`. Nodes are matched across layouts
// by their keys, which stay the same when the root person changes.
export class RelationshipChart extends ChartCanvas {
  constructor() {
    super()
    this._rootHandle = null
  }

  get boxSize() {
    return {boxWidth, boxHeight}
  }

  get nodeClass() {
    return 'node'
  }

  prepare(layout) {
    this._rootHandle = layout.root?.handle ?? null
    return {
      bounds: layout.bounds,
      rootHandle: this._rootHandle,
      candidates: layout.nodes
        .filter(node => this.isRootPerson(node))
        .map(node => ({key: node.key, position: place(node)})),
    }
  }

  nodeKey(node) {
    return node.key
  }

  linkKey(link) {
    return link.key
  }

  drawnLinks(layout) {
    return layout.links.filter(link => link.points.length > 0)
  }

  enterNode(enter) {
    const node = enter.append('g').attr('class', d => `node ${d.kind}`)
    node
      .filter(d => d.kind === 'person')
      .append('g')
      .attr('class', 'person-card')
    node
      .filter(d => d.kind === 'family')
      .append('g')
      .attr('class', 'family-marker')
    return node
  }

  isPerson(node) {
    return node.kind === 'person'
  }

  isRootPerson(node) {
    return this.isPerson(node) && node.handle === this._rootHandle
  }

  linkEnds({source, target}) {
    return [
      source.kind === 'family'
        ? [source.x + markerPosition[0], source.y + markerPosition[1]]
        : [source.x, source.y + boxHeight / 2],
      [target.x, target.y - boxHeight / 2],
    ]
  }

  linkPath([start, end]) {
    if (end[1] > start[1]) {
      return curve({source: start, target: end})
    }
    const top = end[1] - archHeight
    return `M${start[0]},${start[1]}V${top}H${end[0]}V${end[1]}`
  }

  styleLinks(links, palette) {
    this._links.attr('stroke', palette.relationshipLink)
    links.attr('stroke-dasharray', link =>
      link.kind === 'child' && link.relation !== 'Birth' ? '6 4' : null
    )
  }

  // Family markers are small, so they are redrawn on every update. The
  // marker of a family whose partners are not next to each other sits on a
  // bracket that joins the bottoms of their cards.
  drawExtras(nodes, {palette}) {
    const markers = nodes
      .filter(node => node.kind === 'family')
      .select('.family-marker')
    markers.selectChildren().remove()
    markers
      .filter(node => node.bracket)
      .append('path')
      .attr('class', 'bracket')
      .attr('fill', 'none')
      .attr('stroke', palette.relationshipLink)
      .attr('d', ({bracket: {left, right, top}}) =>
        [
          `M${left},${top}`,
          `V${markerPosition[1]}`,
          `H${right}`,
          `V${top}`,
        ].join('')
      )
    appendFamilyMarker(markers, {boxHeight, palette})
    // The bracket reaches the marker from one side only, so the marker's
    // own line would stick out on the other
    markers
      .filter(node => node.bracket)
      .select('line')
      .remove()
  }
}
