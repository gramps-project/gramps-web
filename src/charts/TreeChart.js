import {create, local} from 'd3-selection'
import {curveBumpX, link, symbolTriangle, symbol} from 'd3-shape'
import {zoom, zoomIdentity, zoomTransform} from 'd3-zoom'
import {fireEvent} from '../util.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'
import {chartPalette} from './palette.js'
import {
  appendPersonCard,
  clearPersonCardInteraction,
  setPersonCardInteraction,
} from './personCard.js'

// Returns the viewBox start along one axis. A chart that fits the view is
// centred as a whole. One that overflows is centred on `focus`, without
// showing space beyond the chart's extent.
export function viewBoxStart(focus, extentMin, extentMax, viewSize) {
  if (extentMax - extentMin <= viewSize) {
    return (extentMin + extentMax - viewSize) / 2
  }
  return Math.min(
    Math.max(focus - viewSize / 2, extentMin),
    extentMax - viewSize
  )
}

// The inputs each card was last drawn with
const cardInputs = local()

// Draws layouts from `layoutAncestors`, `layoutDescendants` or
// `layoutHourglass` into an SVG that is created once. Each update changes only
// what differs: positions, the viewBox and edit mode are updated in place, and
// a card is redrawn only when its person, image, name format or palette
// changes.
export class TreeChart {
  constructor() {
    this._zoom = zoom().on('zoom', event =>
      this._content.attr('transform', event.transform)
    )
    this._svg = create('svg')
      .attr('font-family', 'Inter var')
      .attr('font-size', 13)
      .call(this._zoom)
    this._content = this._svg.append('g').attr('id', 'chart-content')
    this._links = this._content
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1)
    this._nodes = this._content.append('g')
    this._rootHandle = undefined
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
  // `palette`.
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
      bboxWidth,
      bboxHeight,
    }
  ) {
    const {boxWidth, boxHeight} = treeLayoutDefaults
    const {xMin, xMax, yMin, yMax} = layout.bounds
    this._svg.attr('viewBox', [
      viewBoxStart(0, xMin, xMax, bboxWidth),
      viewBoxStart(0, yMin, yMax, bboxHeight),
      bboxWidth,
      bboxHeight,
    ])
    this._resetPanForNewRoot(layout)

    // Links join the facing sides of two boxes, slightly inside their edges
    const linkInset = boxWidth / 2 - 10
    this._links
      .attr('stroke', palette.link)
      .selectChildren('path')
      .data(layout.links, l => l.target.key)
      .join('path')
      .attr('d', ({source, target}) => {
        const direction = Math.sign(target.x - source.x)
        return link(curveBumpX)({
          source: [source.x + direction * linkInset, source.y],
          target: [target.x - direction * linkInset, target.y],
        })
      })

    const nodes = this._nodes
      .selectChildren('.person-node')
      .data(layout.nodes, d => d.key)
      .join(enter => {
        const node = enter.append('g').attr('class', 'person-node')
        node.append('g').attr('class', 'person-card')
        return node
      })
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('filter', d =>
        interactive && d.generation === 0
          ? `drop-shadow(0 3px 8px ${palette.shadow})`
          : null
      )

    const changedCards = nodes
      .filter(function (d) {
        const inputs = {
          person: d.person,
          imageUrl: getImageUrl(d),
          nameDisplayFormat,
          palette,
        }
        const previous = cardInputs.get(this)
        cardInputs.set(this, inputs)
        return (
          !previous ||
          Object.keys(inputs).some(key => inputs[key] !== previous[key])
        )
      })
      .select('.person-card')
    changedCards.selectChildren().remove()
    appendPersonCard(changedCards, {
      profile: d => d.person?.profile,
      imageUrl: getImageUrl,
      boxWidth,
      boxHeight,
      nameDisplayFormat,
      palette,
    })

    if (interactive) {
      setPersonCardInteraction(nodes, {
        profile: d => d.person?.profile,
        handle: d => d.handle,
        boxWidth,
        boxHeight,
        canEdit,
        palette,
      })
    } else {
      clearPersonCardInteraction(nodes)
    }

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

  // A new root person keeps the zoom level but not the pan, so they start at
  // the default position
  _resetPanForNewRoot(layout) {
    const rootHandle = layout.nodes.find(node => node.generation === 0)?.handle
    if (rootHandle === this._rootHandle) {
      return
    }
    this._rootHandle = rootHandle
    const {k} = zoomTransform(this.node)
    this._svg.call(this._zoom.transform, zoomIdentity.scale(k))
  }
}
