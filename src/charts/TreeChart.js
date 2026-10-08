import {fireEvent} from '../util.js'
import {
  buttonRadius,
  enterChartButtons,
  styleChartButtons,
} from './chartButton.js'
import {ChartCanvas, place} from './ChartCanvas.js'
import {roundedPath, sameX} from './connectors.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'

const {boxWidth, boxHeight} = treeLayoutDefaults

const isBirth = link => link.relation === 'Birth'

// Returns the coordinates of a point along the generations of a layout and
// across them: x and y in columns, y and x in rows. The same swap turns them
// back.
const generationAxes = ([x, y], vertical) => (vertical ? [y, x] : [x, y])

// Gives each link the parts it draws of the lines that the links of its
// source on one side share, so that each part is drawn once. One link draws
// the `stem` from the source, and on each side of the stem, the bar runs
// from the stem to the furthest target. A line is dashed where all children
// it leads to are not birth children, so the stem and the bar as far as the
// furthest birth child are drawn by birth links where there are any: the
// furthest birth link draws the bar from the stem, and the link to the
// furthest target, if it is not a birth link, the rest of it. Where a link
// draws a part of the bar, `bar` is how far across the generations from the
// source it starts, and `outer` whether it ends at the furthest target, where
// its corner is rounded. Each link also gets whether the layout is
// `vertical`.
function withSharedParts(links, vertical) {
  const axes = node => generationAxes(place(node), vertical)
  const groups = new Map()
  for (const link of links) {
    const side = Math.sign(axes(link.target)[0] - axes(link.source)[0])
    const key = `${link.source.key}:${side}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(link)
  }
  return [...groups.values()].flatMap(group => {
    const parts = new Map(group.map(link => [link, {...link, vertical}]))
    const [first] = group.filter(isBirth).length ? group.filter(isBirth) : group
    parts.get(first).stem = true
    for (const sign of [-1, 1]) {
      // The links on this side of the stem, from the furthest target in
      const offset = ({source, target}) => axes(target)[1] - axes(source)[1]
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

// The chevron buttons beyond cards: the root person's menu button and the
// buttons that expand branches. Their gap to the card, in pixels.
const buttonGap = 8

// Returns the position of a button on `side` of the card, relative to its
// centre, which keeps a gap to the visible edge of the card: the colour
// stripe reaches 4px past the box on the left
function buttonPosition(side) {
  const distance = buttonGap + buttonRadius
  return {
    left: [-(boxWidth / 2 + 4 + distance), 0],
    right: [boxWidth / 2 + distance, 0],
    top: [0, -(boxHeight / 2 + distance)],
    bottom: [0, boxHeight / 2 + distance],
  }[side]
}

// Returns the buttons of a node, each with its `kind`, 'menu' or 'expand',
// and the `side` of the card it is on and points to. A branch grows towards
// the ancestors or the descendants, in columns or in rows.
function nodeButtons(
  node,
  {interactive, childrenTriangle = false, menuSide = 'left'},
  vertical
) {
  if (!interactive) {
    return []
  }
  const buttons = []
  if (childrenTriangle && node.generation === 0) {
    buttons.push({kind: 'menu', side: menuSide})
  }
  if (node.expandable) {
    const side = {
      ancestors: vertical ? 'top' : 'right',
      descendants: vertical ? 'bottom' : 'left',
    }[node.expandable]
    buttons.push({kind: 'expand', side})
  }
  return buttons
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
// `menuSide` of the card: 'left', 'right', 'top' or 'bottom'.
//
// A node that is `expandable` gets a button labelled with `expandLabels` for
// its direction, on the side where its branch grows. The button fires
// `pedigree:expand-branch` with the node's `handle` and `direction`.
//
// When a layout runs the other way than the previous one, in rows instead of
// columns or back, the links fade out and in.
export class TreeChart extends ChartCanvas {
  constructor() {
    super()
    this._keys = new Map()
    this._root = undefined
    this._vertical = undefined
    this._turned = false
  }

  get boxSize() {
    return {boxWidth, boxHeight}
  }

  get nodeClass() {
    return 'person-node'
  }

  prepare(layout, options) {
    const vertical = Boolean(layout.vertical)
    this._turned = this._vertical !== undefined && vertical !== this._vertical
    this._vertical = vertical
    const previousKeys = this._keys
    this._keys = joinKeys(layout)
    this._root = layout.nodes.find(node => node.generation === 0)
    // The bounds include the buttons, which lie outside the layout
    const bounds = {...layout.bounds}
    for (const node of layout.nodes) {
      for (const {side} of nodeButtons(node, options, vertical)) {
        const [dx, dy] = buttonPosition(side)
        bounds.xMin = Math.min(bounds.xMin, node.x + dx - buttonRadius)
        bounds.xMax = Math.max(bounds.xMax, node.x + dx + buttonRadius)
        bounds.yMin = Math.min(bounds.yMin, node.y + dy - buttonRadius)
        bounds.yMax = Math.max(bounds.yMax, node.y + dy + buttonRadius)
      }
    }
    return {
      bounds,
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
    return withSharedParts(layout.links, Boolean(layout.vertical))
  }

  linkEnds(treeLink) {
    return [place(treeLink.source), place(treeLink.target)]
  }

  get fadesLinks() {
    return this._turned
  }

  // A link joins the facing sides of two boxes slightly inside their edges,
  // turning at right angles in the middle of the gap between them. The links
  // of one source on one side share the stem and the bar, which turns round
  // into the lines to the furthest targets. Each link draws its own parts of
  // them, so that no line is drawn twice, which would show darker edges.
  linkPath([source, target], {stem, bar, outer, vertical}) {
    // Points are given along the generations and across them
    const point = (along, across) => generationAxes([along, across], vertical)
    const line = (...points) => `M${points.map(p => p.join(',')).join('L')}`
    const [g0, s0] = generationAxes(source, vertical)
    const [g1, s1] = generationAxes(target, vertical)
    const inset = (vertical ? boxHeight : boxWidth) / 2 - 10
    const direction = Math.sign(g1 - g0)
    const [a0, a1] = [g0 + direction * inset, g1 - direction * inset]
    const middle = (a0 + a1) / 2
    const stemPath = stem ? line(point(a0, s0), point(middle, s0)) : ''
    if (bar === undefined) {
      return stemPath && sameX(s0, s1)
        ? `${stemPath}L${point(a1, s1).join(',')}`
        : `${stemPath}${line(point(middle, s1), point(a1, s1))}`
    }
    const barPoints = [
      point(middle, s0 + bar),
      point(middle, s1),
      point(a1, s1),
    ]
    const barPath = outer ? roundedPath(barPoints) : line(...barPoints)
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
    this._updateButtons(nodes, options)
  }

  // A button is a chevron pointing away from the card
  _updateButtons(nodes, options) {
    const {triangleLabel = '', expandLabels = {}, palette} = options
    function activate(e, {kind, node}) {
      if (kind === 'menu') {
        fireEvent(this, 'pedigree:show-children', {})
      } else {
        fireEvent(this, 'pedigree:expand-branch', {
          handle: node.handle,
          direction: node.expandable,
        })
      }
    }
    const buttons = nodes
      .selectChildren('.chart-button')
      .data(
        node =>
          nodeButtons(node, options, this._vertical).map(button => ({
            ...button,
            node,
          })),
        ({kind}) => kind
      )
      .join(enter => enterChartButtons(enter, activate))
      .attr('class', ({kind}) =>
        kind === 'menu'
          ? 'chart-button children-triangle'
          : 'chart-button expand-button'
      )
      .attr('id', ({kind}) => (kind === 'menu' ? 'triangle-children' : null))
      .attr('transform', ({side}) => `translate(${buttonPosition(side)})`)
      .attr('aria-label', ({kind, node}) =>
        kind === 'menu' ? triangleLabel : expandLabels[node.expandable]
      )
    styleChartButtons(buttons, palette, ({side}) => side)
  }
}
