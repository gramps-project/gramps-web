import {ChartCanvas, place} from './ChartCanvas.js'
import {appendFamilyMarker, familyMarkerPosition} from './familyMarker.js'
import {relationshipLayoutDefaults} from './layout/relationshipLayout.js'

const {boxWidth, boxHeight} = relationshipLayoutDefaults

// A link runs from the marker of a family, or the bottom of a single
// parent's card, to the top of the child's card, along the right-angled
// route of its `points`. The line down from the source and the bar its links
// share are drawn once, as the source's trunk, and each link as the branch
// from where it leaves the bar, so that a dashed link does not run along the
// lines of the others.
const markerPosition = familyMarkerPosition(boxHeight)

// Returns the trunk of each source and the branch of each link. A link up to
// a child in the same row, which arches over it, has no trunk.
function trunksAndBranches(links) {
  const trunks = new Map()
  const branches = []
  for (const link of links) {
    const {points, source} = link
    if (points.length === 0) {
      continue
    }
    if (points[1][1] < points[0][1]) {
      branches.push({...link, route: points})
      continue
    }
    const [start, corner, leave] = points
    const trunk = trunks.get(source.key) ?? {
      key: `trunk:${source.key}`,
      kind: 'trunk',
      source,
      target: source,
      route: [start, corner],
      left: corner[0],
      right: corner[0],
    }
    trunk.left = Math.min(trunk.left, leave[0])
    trunk.right = Math.max(trunk.right, leave[0])
    trunks.set(source.key, trunk)
    branches.push({...link, route: points.slice(2)})
  }
  return [...trunks.values(), ...branches]
}

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
    return trunksAndBranches(layout.links)
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

  linkEnds({route}) {
    return [route[0], route.at(-1)]
  }

  get fadesLinks() {
    return true
  }

  // A link is drawn along its route, moved with its start
  linkPath([start], link) {
    const {route} = link
    const [dx, dy] = [start[0] - route[0][0], start[1] - route[0][1]]
    const moved = route.map(([x, y]) => [x + dx, y + dy])
    if (link.kind === 'trunk') {
      const [[x, y], [, barY]] = moved
      return `M${x},${y}V${barY}M${link.left + dx},${barY}H${link.right + dx}`
    }
    return moved
      .map(([x, y], i) => {
        if (i === 0) {
          return `M${x},${y}`
        }
        return i % 2 === 1 ? `V${y}` : `H${x}`
      })
      .join('')
  }

  styleLinks(links, palette) {
    this._links
      .attr('stroke', palette.relationshipLink)
      .attr('stroke-width', 1.5)
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
      .attr('stroke-width', 1.5)
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
