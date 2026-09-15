import {create, local} from 'd3-selection'
import {curveBumpX, link, symbolTriangle, symbol} from 'd3-shape'
import {fireEvent} from '../util.js'
import {
  currentPositions,
  elementPosition,
  joinWithTransitions,
  keyOf,
} from './animatedJoin.js'
import {ChartViewport} from './ChartViewport.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'
import {chartPalette} from './palette.js'
import {
  appendPersonCard,
  clearPersonCardInteraction,
  setPersonCardInteraction,
} from './personCard.js'

const {boxWidth, boxHeight} = treeLayoutDefaults

// The inputs each card was last drawn with
const cardInputs = local()

// Returns keys that stay the same for a person across layouts with different
// root people: the handle, numbered when a person appears more than once, or
// the layout key for a person who was not fetched
function joinKeys(layout) {
  const occurrences = new Map()
  return new Map(
    layout.nodes.map(node => {
      if (!node.handle) {
        return [node, `key:${node.key}`]
      }
      const occurrence = occurrences.get(node.handle) ?? 0
      occurrences.set(node.handle, occurrence + 1)
      return [node, `${node.handle}:${occurrence}`]
    })
  )
}

const place = node => [node.x, node.y]

const translate = ([x, y]) => `translate(${x},${y})`

const interpolatePoint = (a, b) => t =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// Returns the path of a link, which joins the facing sides of two boxes
// slightly inside their edges
function linkPath(source, target) {
  const inset = boxWidth / 2 - 10
  const direction = Math.sign(target[0] - source[0])
  return link(curveBumpX)({
    source: [source[0] + direction * inset, source[1]],
    target: [target[0] - direction * inset, target[1]],
  })
}

// Draws layouts from `layoutAncestors`, `layoutDescendants` or
// `layoutHourglass` into an SVG that is created once. Each update changes only
// what differs: positions, the viewBox and edit mode are updated in place, and
// a card is redrawn only when its person, image, name format or palette
// changes. People are matched across layouts by handle, so a person who is in
// both keeps their node and card.
export class TreeChart {
  constructor() {
    this._svg = create('svg')
      .attr('font-family', 'Inter var')
      .attr('font-size', 13)
    const content = this._svg.append('g').attr('id', 'chart-content')
    this._viewport = new ChartViewport(this._svg, content)
    this._links = content
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1)
    this._nodes = content.append('g')
    this._layout = undefined
    this._keys = new Map()
  }

  get node() {
    return this._svg.node()
  }

  // Removes all people and links, keeping the zoom transform
  clear() {
    this._links.selectChildren().remove()
    this._nodes.selectChildren().remove()
  }

  // With `childrenTriangle`, the root person gets a triangle that opens the
  // menu of relatives, on the left for orientation 'LTR' and on the right for
  // 'RTL'. Without `interactive`, the chart has no add person buttons,
  // triangle, click or hover handling, cursors or shadows. Colours come from
  // `palette`. With a `duration` in milliseconds, a new layout is animated:
  // people move from where they were, people who leave fade out and new people
  // fade in.
  update(
    layout,
    {
      childrenTriangle = false,
      orientation = 'LTR',
      getImageUrl = () => '',
      nameDisplayFormat,
      canEdit = false,
      interactive = true,
      palette = chartPalette,
      duration = 0,
      bboxWidth,
      bboxHeight,
    }
  ) {
    // Only a new layout is animated. The chart component passes the same
    // layout object when only the size, edit mode or name format changes.
    const animationDuration = layout === this._layout ? 0 : duration
    this._layout = layout
    const keys = joinKeys(layout)
    const previousKeys = this._keys
    this._keys = keys

    // Positions have to be read before the joins move the nodes
    const positions = currentPositions(this._nodes, '.person-node')
    const root = layout.nodes.find(node => node.generation === 0)
    const shift = this._viewport.show({
      bounds: layout.bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle: root.handle,
      rootKey: keys.get(root),
      positions,
    })
    const transitions = {
      keys,
      previousKeys,
      duration: animationDuration,
      // Where a node was, by the key it was joined with, in the coordinates of
      // the new layout
      previous: (key, fallback) => {
        const position = positions.get(key)
        return position
          ? [position[0] - shift[0], position[1] - shift[1]]
          : fallback
      },
    }

    this._joinLinks(layout.links, transitions, palette)
    const nodes = this._joinNodes(layout.nodes, transitions, {
      interactive,
      palette,
    })
    this._drawChangedCards(nodes, {getImageUrl, nameDisplayFormat, palette})
    this._updateInteraction(nodes, {interactive, canEdit, palette})
    this._updateTriangle(nodes, {
      interactive,
      childrenTriangle,
      orientation,
      palette,
    })
  }

  _joinLinks(links, {keys, previousKeys, previous, duration}, palette) {
    const joined = joinWithTransitions(
      this._links.attr('stroke', palette.link),
      '.link',
      links,
      {
        key: l => keys.get(l.target),
        enter: enter => enter.append('path').attr('class', 'link'),
        exit: exit =>
          exit.attr('d', l =>
            linkPath(
              previous(previousKeys.get(l.source), place(l.source)),
              previous(previousKeys.get(l.target), place(l.target))
            )
          ),
        duration,
      }
    )
    if (duration > 0) {
      const start = node => previous(keys.get(node), place(node))
      joined
        .transition()
        .duration(duration)
        .attrTween('d', l => {
          const source = interpolatePoint(start(l.source), place(l.source))
          const target = interpolatePoint(start(l.target), place(l.target))
          return t => linkPath(source(t), target(t))
        })
    } else {
      joined.attr('d', l => linkPath(place(l.source), place(l.target)))
    }
  }

  _joinNodes(nodes, {keys, previous, duration}, {interactive, palette}) {
    const joined = joinWithTransitions(this._nodes, '.person-node', nodes, {
      key: d => keys.get(d),
      enter: enter => {
        const node = enter.append('g').attr('class', 'person-node')
        node.append('g').attr('class', 'person-card')
        return node
      },
      exit: exit =>
        exit.attr('transform', function () {
          return translate(previous(keyOf(this), elementPosition(this)))
        }),
      duration,
    })
      .style('filter', d =>
        interactive && d.generation === 0
          ? `drop-shadow(0 3px 8px ${palette.shadow})`
          : null
      )
      .on(
        'click.pin',
        interactive
          ? (event, d) => this._viewport.rememberClick(d.handle, keys.get(d))
          : null
      )

    if (duration > 0) {
      // Interpolating the points keeps the transform in the format that
      // `elementPosition` reads, also while nodes move
      const start = d => previous(keys.get(d), place(d))
      joined
        .attr('transform', d => translate(start(d)))
        .transition()
        .duration(duration)
        .attrTween('transform', d => {
          const position = interpolatePoint(start(d), place(d))
          return t => translate(position(t))
        })
    } else {
      joined.attr('transform', d => translate(place(d)))
    }
    return joined
  }

  // Redraws the cards whose person, image, name format or palette changed
  // since they were last drawn
  _drawChangedCards(nodes, {getImageUrl, nameDisplayFormat, palette}) {
    const changed = new Set()
    nodes.each(function (d) {
      const inputs = {
        person: d.person,
        imageUrl: getImageUrl(d),
        nameDisplayFormat,
        palette,
      }
      const previous = cardInputs.get(this)
      cardInputs.set(this, inputs)
      if (
        !previous ||
        Object.keys(inputs).some(key => inputs[key] !== previous[key])
      ) {
        changed.add(this)
      }
    })
    const cards = nodes
      .filter(function () {
        return changed.has(this)
      })
      .select('.person-card')
    cards.selectChildren().remove()
    appendPersonCard(cards, {
      profile: d => d.person?.profile,
      imageUrl: getImageUrl,
      boxWidth,
      boxHeight,
      nameDisplayFormat,
      palette,
    })
  }

  _updateInteraction(nodes, {interactive, canEdit, palette}) {
    if (!interactive) {
      clearPersonCardInteraction(nodes)
      return
    }
    setPersonCardInteraction(nodes, {
      profile: d => d.person?.profile,
      handle: d => d.handle,
      boxWidth,
      boxHeight,
      canEdit,
      palette,
    })
  }

  _updateTriangle(
    nodes,
    {interactive, childrenTriangle, orientation, palette}
  ) {
    const side = orientation === 'LTR' ? -1 : 1
    nodes
      .selectChildren('.children-triangle')
      .data(d =>
        interactive && childrenTriangle && d.generation === 0 ? [d] : []
      )
      .join(enter =>
        enter
          .append('path')
          .attr('class', 'children-triangle')
          .attr('id', 'triangle-children')
          .attr('d', symbol().type(symbolTriangle).size(200))
          .on('click', function (e) {
            fireEvent(this, 'pedigree:show-children', {
              pageX: e.pageX,
              pageY: e.pageY,
            })
            e.stopPropagation()
            e.preventDefault()
          })
      )
      .attr('fill', palette.triangle)
      .attr(
        'transform',
        `translate(${side * (boxWidth / 2 + 12)},0) rotate(${
          side * 90
        }) scale(-1, 0.5)`
      )
  }
}
