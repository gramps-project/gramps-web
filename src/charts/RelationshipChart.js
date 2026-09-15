import {create} from 'd3-selection'
import {linkVertical} from 'd3-shape'
import {
  currentPositions,
  elementPosition,
  interpolatePoint,
  joinWithTransitions,
  keyOf,
  moveElements,
  translate,
} from './animatedJoin.js'
import {ChartViewport} from './ChartViewport.js'
import {appendFamilyMarker, familyMarkerPosition} from './familyMarker.js'
import {relationshipLayoutDefaults} from './layout/relationshipLayout.js'
import {chartPalette} from './palette.js'
import {drawChangedCards, updatePersonCardInteraction} from './personCard.js'

const {boxWidth, boxHeight} = relationshipLayoutDefaults

const place = node => [node.x, node.y]

// A link is drawn as a curve from the start to the end of its route. Links
// from a family start at its marker.
const curve = linkVertical()
const linkPath = ([start, end]) => curve({source: start, target: end})
const markerPosition = familyMarkerPosition(boxHeight)
const routeEnds = ({source, points}) => [
  source.kind === 'family'
    ? [source.x + markerPosition[0], source.y + markerPosition[1]]
    : points[0],
  points[points.length - 1],
]

// Returns the image URL of each person node, leaving out the images of people
// after the first `maxImages` people who have one
function limitImages(nodes, getImageUrl, maxImages) {
  const urls = new Map()
  let count = 0
  for (const node of nodes) {
    if (node.kind === 'person') {
      const url = getImageUrl(node)
      if (url) {
        count += 1
      }
      urls.set(node, count > maxImages ? '' : url)
    }
  }
  return urls
}

// Draws layouts from `layoutRelationships` into an SVG that is created once.
// Each update changes only what differs: positions, the viewBox and edit mode
// are updated in place, and a card is redrawn only when its person, image,
// name format or palette changes. Nodes are matched across layouts by their
// keys, which stay the same when the root person changes.
export class RelationshipChart {
  constructor() {
    this._svg = create('svg')
      .attr('font-family', 'Inter var')
      .attr('font-size', 13)
    const content = this._svg.append('g').attr('id', 'chart-content')
    this._viewport = new ChartViewport(this._svg, content)
    this._links = content
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-width', 1)
    this._nodes = content.append('g')
    this._layout = undefined
  }

  get node() {
    return this._svg.node()
  }

  // Removes all people, families and links, keeping the zoom transform
  clear() {
    this._links.selectChildren().remove()
    this._nodes.selectChildren().remove()
  }

  // Without `interactive`, the chart has no add person buttons, click or
  // hover handling, cursors or shadows. Only the first `maxImages` people with
  // an image show it. Colours come from `palette`. With a `duration` in
  // milliseconds, a new layout is animated: people move from where they were,
  // people who leave fade out and new people fade in. With `fit`, a chart
  // whose root person was not on screen starts zoomed out to show all of it.
  update(
    layout,
    {
      getImageUrl = () => '',
      maxImages = 50,
      nameDisplayFormat,
      canEdit = false,
      interactive = true,
      palette = chartPalette,
      duration = 0,
      fit = false,
      bboxWidth,
      bboxHeight,
    }
  ) {
    // Only a new layout is animated. Chart components pass the same layout
    // object when only the size, edit mode or name format changes.
    const newLayout = layout !== this._layout
    const animationDuration = newLayout ? duration : 0
    this._layout = layout

    // Positions have to be read before the joins move the nodes
    const positions = currentPositions(this._nodes, '.node')
    const rootHandle = layout.root?.handle ?? null
    const {offset} = this._viewport.show({
      bounds: layout.bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle,
      candidates: layout.nodes
        .filter(node => node.kind === 'person' && node.handle === rootHandle)
        .map(node => ({key: node.key, position: place(node)})),
      positions,
      fit,
      newLayout,
    })
    // Where something was, in the coordinates of the new layout
    const shift = ([x, y]) => [x - offset[0], y - offset[1]]
    const previous = (key, fallback) =>
      positions.has(key) ? shift(positions.get(key)) : fallback
    const transitions = {previous, shift, duration: animationDuration}

    this._joinLinks(layout.links, transitions, palette)
    const nodes = this._joinNodes(layout.nodes, transitions, {
      interactive,
      palette,
      rootHandle,
    })
    const people = nodes.filter(node => node.kind === 'person')
    const imageUrls = limitImages(layout.nodes, getImageUrl, maxImages)
    drawChangedCards(people, {
      getImageUrl: node => imageUrls.get(node) ?? '',
      nameDisplayFormat,
      palette,
      boxWidth,
      boxHeight,
    })
    updatePersonCardInteraction(people, {
      interactive,
      canEdit,
      palette,
      boxWidth,
      boxHeight,
    })
    // Family markers are small, so they are redrawn on every update
    const markers = nodes
      .filter(node => node.kind === 'family')
      .select('.family-marker')
    markers.selectChildren().remove()
    appendFamilyMarker(markers, {boxHeight, palette})
  }

  _joinLinks(links, {previous, shift, duration}, palette) {
    const joined = joinWithTransitions(
      this._links.attr('stroke', palette.relationshipLink),
      '.link',
      links.filter(link => link.points.length > 0),
      {
        key: link => link.key,
        enter: enter => enter.append('path').attr('class', 'link'),
        exit: exit =>
          exit.attr('d', link => linkPath(routeEnds(link).map(shift))),
        duration,
      }
    ).attr('stroke-dasharray', link =>
      link.kind === 'child' && link.relation !== 'Birth' ? '6 4' : null
    )

    if (duration > 0) {
      // The ends of a route move with the nodes they belong to
      const startOf = (point, node) => {
        const [x, y] = previous(node.key, place(node))
        return [point[0] + x - node.x, point[1] + y - node.y]
      }
      joined
        .transition()
        .duration(duration)
        .attrTween('d', link => {
          const [start, end] = routeEnds(link)
          const from = interpolatePoint(startOf(start, link.source), start)
          const to = interpolatePoint(startOf(end, link.target), end)
          return t => linkPath([from(t), to(t)])
        })
    } else {
      joined.attr('d', link => linkPath(routeEnds(link)))
    }
  }

  _joinNodes(nodes, {previous, duration}, {interactive, palette, rootHandle}) {
    const joined = joinWithTransitions(
      this._nodes,
      '.node',
      nodes.filter(node => node.kind !== 'placeholder'),
      {
        key: node => node.key,
        enter: enter => {
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
        },
        exit: exit =>
          exit.attr('transform', function () {
            return translate(previous(keyOf(this), elementPosition(this)))
          }),
        duration,
      }
    )
      .style('filter', d =>
        interactive && d.kind === 'person' && d.handle === rootHandle
          ? `drop-shadow(0 3px 8px ${palette.shadow})`
          : null
      )
      .on(
        'click.pin',
        interactive
          ? (event, d) => {
              if (d.kind === 'person') {
                this._viewport.rememberClick(d.handle, d.key)
              }
            }
          : null
      )
    moveElements(joined, {
      position: place,
      start: d => previous(d.key, place(d)),
      duration,
    })
    return joined
  }
}
