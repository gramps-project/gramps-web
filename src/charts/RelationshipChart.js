import {ChartCanvas, place} from './ChartCanvas.js'
import {cornerRadius, roundedPath, sameX} from './connectors.js'
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
//
// A line is dashed where all children it leads to are not birth children:
// the trunk if all of them are, and the bar beyond the last birth child on
// each side, which the outermost branch on that side draws as its start.
//
// Where one line turns from an end of the bar down, the corner is rounded:
// the stem's as part of the trunk, and a branch's as the start of the
// branch, from the bar, which then stops short of that end. Where the stem
// and a branch meet the bar at the same x, the lines meet square.
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
      branches: [],
    }
    trunk.left = Math.min(trunk.left, leave[0])
    trunk.right = Math.max(trunk.right, leave[0])
    trunks.set(source.key, trunk)
    const branch = {...link, route: points.slice(2)}
    trunk.branches.push(branch)
    branches.push(branch)
  }
  const isBirth = link => link.relation === 'Birth'
  for (const trunk of trunks.values()) {
    const stemX = trunk.route[0][0]
    const half = (trunk.right - trunk.left) / 2
    trunk.dashed = !trunk.branches.some(isBirth)
    // A stem at one end of the bar turns into it, unless a branch goes on
    // straight down from it
    trunk.stemTurns =
      half > 0 &&
      (sameX(stemX, trunk.left) || sameX(stemX, trunk.right)) &&
      !trunk.branches.some(({route}) => sameX(route[0][0], stemX))
    // Where the trunk's bar ends on each side, short of a rounded corner
    trunk.barEnds = {left: stemX, right: stemX}
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1
      const end = trunk[side]
      const outward = trunk.branches.filter(
        ({route}) => sign * (route[0][0] - stemX) > 0.5
      )
      const [outer] = outward.filter(({route}) => sameX(route[0][0], end))
      if (!outer) {
        continue
      }
      // The bar reaches as far as the birth children on this side; beyond
      // them, the outermost branch draws it
      const solidEnd = trunk.dashed
        ? end
        : outward
            .filter(isBirth)
            .map(({route}) => route[0][0])
            .reduce((a, b) => (sign * (b - a) > 0 ? b : a), stemX)
      const [[x, y], next] = outer.route
      if (sameX(solidEnd, end)) {
        const down = next[1] - y
        const radius = Math.min(
          cornerRadius,
          half,
          outer.route.length === 2 ? down : down / 2
        )
        trunk.barEnds[side] = end - sign * radius
        outer.lead = [x - sign * radius, y]
      } else {
        trunk.barEnds[side] = solidEnd
        outer.lead = [solidEnd, y]
      }
    }
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
    const move = ([x, y]) => [x + dx, y + dy]
    if (link.kind === 'trunk') {
      const [stemStart, stemEnd] = route.map(move)
      const [left, right] = [link.barEnds.left + dx, link.barEnds.right + dx]
      const [stemX, barY] = stemEnd
      if (link.stemTurns) {
        const end = sameX(stemX, link.left + dx) ? right : left
        return roundedPath([stemStart, stemEnd, [end, barY]])
      }
      if (sameX(left, right)) {
        return roundedPath([stemStart, stemEnd])
      }
      return `${roundedPath([stemStart, stemEnd])}M${left},${barY}H${right}`
    }
    return roundedPath([
      ...(link.lead ? [move(link.lead)] : []),
      ...route.map(move),
    ])
  }

  styleLinks(links, palette) {
    this._links.attr('stroke', palette.link).attr('stroke-width', 1.5)
    links.attr('stroke-dasharray', link =>
      (link.kind === 'child' && link.relation !== 'Birth') || link.dashed
        ? '6 4'
        : null
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
      .attr('stroke', palette.link)
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
