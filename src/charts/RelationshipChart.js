import {linkVertical} from 'd3-shape'
import {ChartCanvas, place} from './ChartCanvas.js'
import {appendFamilyMarker, familyMarkerPosition} from './familyMarker.js'
import {relationshipLayoutDefaults} from './layout/relationshipLayout.js'

const {boxWidth, boxHeight} = relationshipLayoutDefaults

// A link is drawn as a curve from the start to the end of its route. Links
// from a family start at its marker.
const curve = linkVertical()
const markerPosition = familyMarkerPosition(boxHeight)

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

  drawnNodes(layout) {
    return layout.nodes.filter(node => node.kind !== 'placeholder')
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

  linkEnds({source, points}) {
    return [
      source.kind === 'family'
        ? [source.x + markerPosition[0], source.y + markerPosition[1]]
        : points[0],
      points[points.length - 1],
    ]
  }

  linkPath([start, end]) {
    return curve({source: start, target: end})
  }

  styleLinks(links, palette) {
    this._links.attr('stroke', palette.relationshipLink)
    links.attr('stroke-dasharray', link =>
      link.kind === 'child' && link.relation !== 'Birth' ? '6 4' : null
    )
  }

  // Family markers are small, so they are redrawn on every update
  drawExtras(nodes, {palette}) {
    const markers = nodes
      .filter(node => node.kind === 'family')
      .select('.family-marker')
    markers.selectChildren().remove()
    appendFamilyMarker(markers, {boxHeight, palette})
  }
}
