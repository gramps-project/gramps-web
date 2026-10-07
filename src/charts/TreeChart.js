import {select} from 'd3-selection'
import {mdiChevronLeft, mdiChevronRight} from '@mdi/js'
import {fireEvent} from '../util.js'
import {ChartCanvas, place} from './ChartCanvas.js'
import {roundedPath, sameX} from './connectors.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'

const {boxWidth, boxHeight} = treeLayoutDefaults

const isBirth = link => link.relation === 'Birth'

// Gives each link the parts it draws of the lines that the links of its
// source on one side share, so that each part is drawn once. One link draws
// the `stem` from the source, and on each side of the stem, the bar runs
// from the stem to the furthest target. A line is dashed where all children
// it leads to are not birth children, so the stem and the bar as far as the
// furthest birth child are drawn by birth links where there are any: the
// furthest birth link draws the bar from the stem, and the link to the
// furthest target, if it is not a birth link, the rest of it. Where a link
// draws a part of the bar, `bar` is how far below the source it starts, and
// `outer` whether it ends at the furthest target, where its corner is
// rounded.
function withSharedParts(links) {
  const groups = new Map()
  for (const link of links) {
    const side = Math.sign(link.target.x - link.source.x)
    const key = `${link.source.key}:${side}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(link)
  }
  return [...groups.values()].flatMap(group => {
    const parts = new Map(group.map(link => [link, {...link}]))
    const [first] = group.filter(isBirth).length ? group.filter(isBirth) : group
    parts.get(first).stem = true
    for (const sign of [-1, 1]) {
      // The links on this side of the stem, from the furthest target in
      const offset = ({source, target}) => target.y - source.y
      const side = group
        .filter(link => sign * offset(link) > 0 && !sameX(offset(link), 0))
        .sort((a, b) => sign * (offset(b) - offset(a)))
      if (side.length === 0) {
        continue
      }
      const [outer] = side
      const solid = side.find(isBirth)
      if (solid) {
        parts.get(solid).bar = 0
      }
      if (solid !== outer) {
        parts.get(outer).bar = solid ? offset(solid) : 0
      }
      parts.get(outer).outer = true
    }
    return [...parts.values()]
  })
}

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

  drawnLinks(layout) {
    return withSharedParts(layout.links)
  }

  linkEnds(treeLink) {
    return [place(treeLink.source), place(treeLink.target)]
  }

  // A link joins the facing sides of two boxes slightly inside their edges,
  // turning at right angles in the middle of the gap between them. The links
  // of one source on one side share the stem and the bar, which turns round
  // into the lines to the furthest targets. Each link draws its own parts of
  // them, so that no line is drawn twice, which would show darker edges.
  linkPath([source, target], {stem, bar, outer}) {
    const inset = boxWidth / 2 - 10
    const direction = Math.sign(target[0] - source[0])
    const [x0, y0] = [source[0] + direction * inset, source[1]]
    const [x1, y1] = [target[0] - direction * inset, target[1]]
    const middle = (x0 + x1) / 2
    const stemPath = stem ? `M${x0},${y0}H${middle}` : ''
    if (bar === undefined) {
      return stemPath && sameX(y0, y1)
        ? `${stemPath}H${x1}`
        : `${stemPath}M${middle},${y1}H${x1}`
    }
    const from = [middle, y0 + bar]
    const barPath = outer
      ? roundedPath([from, [middle, y1], [x1, y1]])
      : `M${from.join(',')}V${y1}H${x1}`
    // The bar goes on from the end of the stem
    return stemPath && bar === 0
      ? `${stemPath}L${barPath.slice(1)}`
      : `${stemPath}${barPath}`
  }

  styleLinks(links, palette) {
    this._links.attr('stroke', palette.link).attr('stroke-width', 1.5)
    links.attr('stroke-dasharray', link => (isBirth(link) ? null : '6 4'))
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
