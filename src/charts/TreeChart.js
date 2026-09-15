import {create, select} from 'd3-selection'
import {curveBumpX, link} from 'd3-shape'
import {mdiChevronLeft, mdiChevronRight} from '@mdi/js'
import {fireEvent} from '../util.js'
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
import {treeLayoutDefaults} from './layout/treeLayout.js'
import {chartPalette} from './palette.js'
import {drawChangedCards, updatePersonCardInteraction} from './personCard.js'

const {boxWidth, boxHeight} = treeLayoutDefaults

// Radius of the root person's menu button and its gap to the card, in pixels
const menuButtonRadius = 20
const menuButtonGap = 8

// Returns the horizontal position of the root person's menu button, which
// keeps a gap to the visible edge of the card: the colour stripe reaching 4px
// past the box on the left for orientation 'LTR', the box on the right for
// 'RTL'
function menuButtonX(orientation) {
  return orientation === 'LTR'
    ? -(boxWidth / 2 + 4 + menuButtonGap + menuButtonRadius)
    : boxWidth / 2 + menuButtonGap + menuButtonRadius
}

// Returns `bounds` widened to include the root person's menu button, which
// lies outside the layout
function boundsWithMenuButton(bounds, orientation) {
  const x = menuButtonX(orientation)
  return {
    ...bounds,
    xMin: Math.min(bounds.xMin, x - menuButtonRadius),
    xMax: Math.max(bounds.xMax, x + menuButtonRadius),
  }
}

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

// Gives `node` the join key `key`, and gives the node that had that key the
// previous key of `node`
function assignKey(keys, node, key) {
  const previousKey = keys.get(node)
  for (const [other, otherKey] of keys) {
    if (otherKey === key) {
      keys.set(other, previousKey)
    }
  }
  keys.set(node, key)
}

const place = node => [node.x, node.y]

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

  get viewport() {
    return this._viewport
  }

  // Removes all people and links, keeping the zoom transform
  clear() {
    this._links.selectChildren().remove()
    this._nodes.selectChildren().remove()
  }

  // With `childrenTriangle`, the root person gets a triangle button labelled
  // `triangleLabel` that opens the menu of relatives, on the left for
  // orientation 'LTR' and on the right for 'RTL'. Without `interactive`, the
  // chart has no add person buttons, triangle, click or hover handling, cursors
  // or shadows. Colours come from `palette`. With a `duration` in milliseconds, a new layout is animated:
  // people move from where they were, people who leave fade out and new people
  // fade in.
  update(
    layout,
    {
      childrenTriangle = false,
      triangleLabel = '',
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
    const newLayout = layout !== this._layout
    const animationDuration = newLayout ? duration : 0
    this._layout = layout
    const keys = joinKeys(layout)
    const previousKeys = this._keys
    this._keys = keys

    // Positions have to be read before the joins move the nodes
    const positions = currentPositions(this._nodes, '.person-node')
    const root = layout.nodes.find(node => node.generation === 0)
    const {offset, keptKey} = this._viewport.show({
      bounds:
        interactive && childrenTriangle
          ? boundsWithMenuButton(layout.bounds, orientation)
          : layout.bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle: root.handle,
      // Any node of the root person in the previous layout can become the
      // root node, which is at the origin
      candidates: [...previousKeys]
        .filter(([node]) => node.handle === root.handle)
        .map(([, key]) => ({key, position: [0, 0]})),
      positions,
      newLayout,
    })
    // The node kept in place becomes the root node, also when it is another
    // occurrence of a person who appears more than once
    if (keptKey) {
      assignKey(keys, root, keptKey)
    }
    const transitions = {
      keys,
      previousKeys,
      duration: animationDuration,
      // Where a node was, by the key it was joined with, in the coordinates of
      // the new layout
      previous: (key, fallback) => {
        const position = positions.get(key)
        return position
          ? [position[0] - offset[0], position[1] - offset[1]]
          : fallback
      },
    }

    this._joinLinks(layout.links, transitions, palette)
    const nodes = this._joinNodes(layout.nodes, transitions, {
      interactive,
      palette,
    })
    drawChangedCards(nodes, {
      getImageUrl,
      nameDisplayFormat,
      palette,
      boxWidth,
      boxHeight,
    })
    updatePersonCardInteraction(nodes, {
      interactive,
      canEdit,
      palette,
      boxWidth,
      boxHeight,
    })
    this._updateTriangle(nodes, {
      interactive,
      childrenTriangle,
      triangleLabel,
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
    moveElements(joined, {
      position: place,
      start: d => previous(keys.get(d), place(d)),
      duration,
    })
    return joined
  }

  // The menu button is a chevron pointing away from the root card, in a round
  // area of `menuButtonRadius` that is shaded while the pointer is on it or it
  // has focus
  _updateTriangle(
    nodes,
    {interactive, childrenTriangle, triangleLabel, orientation, palette}
  ) {
    const side = orientation === 'LTR' ? -1 : 1
    const x = menuButtonX(orientation)
    function openMenu(e) {
      fireEvent(this, 'pedigree:show-children', {})
      e.stopPropagation()
      e.preventDefault()
    }
    // Shades the button while the pointer is on it or it has focus
    function shade() {
      select(this)
        .select('circle')
        .attr('fill-opacity', this.matches(':hover, :focus') ? 1 : 0)
    }
    const triangles = nodes
      .selectChildren('.children-triangle')
      .data(d =>
        interactive && childrenTriangle && d.generation === 0 ? [d] : []
      )
      .join(enter => {
        const triangle = enter
          .append('g')
          .attr('class', 'children-triangle')
          .attr('id', 'triangle-children')
          .attr('role', 'button')
          .attr('tabindex', 0)
          .style('cursor', 'pointer')
          .on('click', openMenu)
          .on('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              openMenu.call(this, e)
            }
          })
          .on('mouseenter mouseleave focus blur', shade)
        triangle
          .append('circle')
          .attr('r', menuButtonRadius)
          .attr('fill-opacity', 0)
        // The 24px icon is centred on the button
        triangle.append('path').attr('transform', 'translate(-12,-12)')
        return triangle
      })
      .attr('transform', `translate(${x},0)`)
      .attr('aria-label', triangleLabel)
    triangles.select('circle').attr('fill', palette.triangleHover)
    triangles
      .select('path')
      .attr('d', side < 0 ? mdiChevronLeft : mdiChevronRight)
      .attr('fill', palette.triangle)
  }
}
