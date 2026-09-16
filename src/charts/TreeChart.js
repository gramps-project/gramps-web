import {select} from 'd3-selection'
import {curveBumpX, link} from 'd3-shape'
import {mdiChevronLeft, mdiChevronRight} from '@mdi/js'
import {fireEvent} from '../util.js'
import {ChartCanvas, place} from './ChartCanvas.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'

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

// Draws layouts from `layoutAncestors`, `layoutDescendants` or
// `layoutHourglass`. People are matched across layouts by handle, so a person
// who is in both keeps their node and card.
//
// With the update option `childrenTriangle`, the root person gets a menu
// button labelled `triangleLabel` that opens the menu of relatives, on the
// left for `orientation` 'LTR' and on the right for 'RTL'.
export class TreeChart extends ChartCanvas {
  constructor() {
    super()
    this._links.attr('stroke-opacity', 0.4)
    this._keys = new Map()
    this._root = undefined
  }

  get boxSize() {
    return {boxWidth, boxHeight}
  }

  get nodeClass() {
    return 'person-node'
  }

  prepare(
    layout,
    {interactive, childrenTriangle = false, orientation = 'LTR'}
  ) {
    const previousKeys = this._keys
    this._keys = joinKeys(layout)
    this._root = layout.nodes.find(node => node.generation === 0)
    return {
      bounds:
        interactive && childrenTriangle
          ? boundsWithMenuButton(layout.bounds, orientation)
          : layout.bounds,
      rootHandle: this._root.handle,
      // Any node of the root person in the previous layout can become the
      // root node, which is at the origin
      candidates: [...previousKeys]
        .filter(([node]) => node.handle === this._root.handle)
        .map(([, key]) => ({key, position: [0, 0]})),
    }
  }

  // The node kept in place becomes the root node, also when it is another
  // occurrence of a person who appears more than once
  keepInPlace(key) {
    assignKey(this._keys, this._root, key)
  }

  nodeKey(node) {
    return this._keys.get(node)
  }

  linkKey(treeLink) {
    return this._keys.get(treeLink.target)
  }

  enterNode(enter) {
    const node = enter.append('g').attr('class', 'person-node')
    node.append('g').attr('class', 'person-card')
    return node
  }

  isRootPerson(node) {
    return node.generation === 0
  }

  linkEnds(treeLink) {
    return [place(treeLink.source), place(treeLink.target)]
  }

  // A link joins the facing sides of two boxes slightly inside their edges
  linkPath([source, target]) {
    const inset = boxWidth / 2 - 10
    const direction = Math.sign(target[0] - source[0])
    return link(curveBumpX)({
      source: [source[0] + direction * inset, source[1]],
      target: [target[0] - direction * inset, target[1]],
    })
  }

  styleLinks(links, palette) {
    this._links.attr('stroke', palette.link)
  }

  drawExtras(nodes, options) {
    this._updateMenuButton(nodes, options)
  }

  // The menu button is a chevron pointing away from the root card, in a round
  // area of `menuButtonRadius` that is shaded while the pointer is on it or it
  // has focus
  _updateMenuButton(
    nodes,
    {
      interactive,
      childrenTriangle = false,
      triangleLabel = '',
      orientation = 'LTR',
      palette,
    }
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
    const buttons = nodes
      .selectChildren('.children-triangle')
      .data(d =>
        interactive && childrenTriangle && d.generation === 0 ? [d] : []
      )
      .join(enter => {
        const button = enter
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
        button
          .append('circle')
          .attr('r', menuButtonRadius)
          .attr('fill-opacity', 0)
        // The 24px icon is centred on the button
        button.append('path').attr('transform', 'translate(-12,-12)')
        return button
      })
      .attr('transform', `translate(${x},0)`)
      .attr('aria-label', triangleLabel)
    buttons.select('circle').attr('fill', palette.triangleHover)
    buttons
      .select('path')
      .attr('d', side < 0 ? mdiChevronLeft : mdiChevronRight)
      .attr('fill', palette.triangle)
  }
}
