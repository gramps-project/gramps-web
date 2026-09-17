import {create} from 'd3-selection'
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
import {chartPalette} from './palette.js'
import {drawChangedCards, updatePersonCardInteraction} from './personCard.js'

export const place = node => [node.x, node.y]

// Draws layouts of nodes and links into an SVG that is created once. Each
// update changes only what differs: positions, the viewBox and edit mode are
// updated in place, and a card is redrawn only when its person, image, name
// format or palette changes. Nodes are matched across layouts by the keys a
// subclass gives them, so a node that is in both layouts keeps its element and
// moves.
//
// A subclass describes its chart:
// - `boxSize`: the `boxWidth` and `boxHeight` of person cards.
// - `nodeClass`: the class of node elements.
// - `prepare(layout, options)`: called first in each update. Returns the
//   `bounds` of the view, the `rootHandle` and the `candidates` that
//   `ChartViewport.show` keeps in place.
// - `keepInPlace(key)`: called with the key of the node the viewport keeps in
//   place, if any.
// - `nodeKey(node)` and `linkKey(link)`: the keys that match elements across
//   layouts.
// - `enterNode(selection)`: appends new node elements, with a `.person-card`
//   group in each person node.
// - `isRootPerson(node)`: whether the node is the root person's card, which
//   gets a shadow.
// - `linkEnds(link)`: the start and end of a link, which move with its source
//   and target node, and `linkPath(ends)`: the path between them.
// - `styleLinks(links, palette)`: the stroke of the links.
// - Optionally `drawnNodes(layout)` and `drawnLinks(layout)`: the nodes and
//   links to draw, `isPerson(node)`, `cardImageUrl(layout, options)`: the
//   image URL of each person node, and `drawExtras(nodes, options)`: whatever
//   else the nodes show.
export class ChartCanvas {
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

  get viewport() {
    return this._viewport
  }

  // Removes all nodes and links, keeping the zoom transform
  clear() {
    this._links.selectChildren().remove()
    this._nodes.selectChildren().remove()
  }

  // Without `interactive`, the chart has no add person buttons, click or
  // hover handling, cursors or shadows. Colours come from `palette`. With a
  // `duration` in milliseconds, a new layout is animated: nodes move from
  // where they were, nodes that leave fade out and new nodes fade in. With
  // `fit`, a chart whose root person was not on screen starts zoomed out to
  // show all of it. Subclasses take further options.
  update(layout, options = {}) {
    const {
      nameDisplayFormat,
      canEdit = false,
      duration = 0,
      fit = false,
      bboxWidth,
      bboxHeight,
    } = options
    const settings = {
      ...options,
      getImageUrl: options.getImageUrl ?? (() => ''),
      interactive: options.interactive ?? true,
      palette: options.palette ?? chartPalette,
    }
    const {interactive, palette} = settings
    // Only a new layout is animated. Chart components pass the same layout
    // object when only the size, edit mode or name format changes.
    const newLayout = layout !== this._layout
    this._layout = layout
    const {bounds, rootHandle, candidates} = this.prepare(layout, settings)

    // Positions have to be read before the joins move the nodes
    const positions = currentPositions(this._nodes, `.${this.nodeClass}`)
    const {offset, keptKey} = this._viewport.show({
      bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle,
      candidates,
      positions,
      fit,
      newLayout,
    })
    if (keptKey) {
      this.keepInPlace(keptKey)
    }
    // Where something was, in the coordinates of the new layout
    const shift = ([x, y]) => [x - offset[0], y - offset[1]]
    const transitions = {
      duration: newLayout ? duration : 0,
      shift,
      previous: (key, fallback) =>
        positions.has(key) ? shift(positions.get(key)) : fallback,
    }

    this._joinLinks(layout, transitions, palette)
    const nodes = this._joinNodes(layout, transitions, {interactive, palette})
    const people = nodes.filter(node => this.isPerson(node))
    const {boxWidth, boxHeight} = this.boxSize
    drawChangedCards(people, {
      getImageUrl: this.cardImageUrl(layout, settings),
      nameDisplayFormat,
      birthSymbol: settings.birthSymbol,
      deathSymbol: settings.deathSymbol,
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
    this.drawExtras(nodes, settings)
  }

  keepInPlace() {}

  drawnNodes(layout) {
    return layout.nodes
  }

  drawnLinks(layout) {
    return layout.links
  }

  isPerson() {
    return true
  }

  cardImageUrl(layout, {getImageUrl}) {
    return getImageUrl
  }

  drawExtras() {}

  _joinLinks(layout, {previous, shift, duration}, palette) {
    const links = joinWithTransitions(
      this._links,
      '.link',
      this.drawnLinks(layout),
      {
        key: link => this.linkKey(link),
        enter: enter => enter.append('path').attr('class', 'link'),
        exit: exit =>
          exit.attr('d', link => this.linkPath(this.linkEnds(link).map(shift))),
        duration,
      }
    )
    this.styleLinks(links, palette)

    if (duration > 0) {
      // The ends of a link move with the nodes they belong to
      const startOf = (point, node) => {
        const [x, y] = previous(this.nodeKey(node), place(node))
        return [point[0] + x - node.x, point[1] + y - node.y]
      }
      links
        .transition()
        .duration(duration)
        .attrTween('d', link => {
          const [start, end] = this.linkEnds(link)
          const from = interpolatePoint(startOf(start, link.source), start)
          const to = interpolatePoint(startOf(end, link.target), end)
          return t => this.linkPath([from(t), to(t)])
        })
    } else {
      links.attr('d', link => this.linkPath(this.linkEnds(link)))
    }
  }

  _joinNodes(layout, {previous, duration}, {interactive, palette}) {
    const nodes = joinWithTransitions(
      this._nodes,
      `.${this.nodeClass}`,
      this.drawnNodes(layout),
      {
        key: node => this.nodeKey(node),
        enter: enter => this.enterNode(enter),
        exit: exit =>
          exit.attr('transform', function () {
            return translate(previous(keyOf(this), elementPosition(this)))
          }),
        duration,
      }
    )
      .style('filter', node =>
        interactive && this.isRootPerson(node)
          ? `drop-shadow(0 3px 8px ${palette.shadow})`
          : null
      )
      .on(
        'click.pin',
        interactive
          ? (event, node) => {
              if (this.isPerson(node)) {
                this._viewport.rememberClick(node.handle, this.nodeKey(node))
              }
            }
          : null
      )
    moveElements(nodes, {
      position: place,
      start: node => previous(this.nodeKey(node), place(node)),
      duration,
    })
    return nodes
  }
}
