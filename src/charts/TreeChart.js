import {create} from 'd3-selection'
import {curveBumpX, link, symbolTriangle, symbol} from 'd3-shape'
import {zoom} from 'd3-zoom'
import {fireEvent} from '../util.js'
import {treeLayoutDefaults} from './layout/treeLayout.js'
import {appendPersonCard} from './personCard.js'

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

// Draws a layout from `layoutAncestors`, `layoutDescendants` or
// `layoutHourglass`. With `childrenTriangle`, the root person gets a triangle
// that opens the menu of relatives, on the left for orientation 'LTR' and on
// the right for 'RTL'.
export function TreeChart(
  layout,
  {
    childrenTriangle = false,
    orientation = 'LTR',
    getImageUrl = () => '',
    nameDisplayFormat,
    canEdit = false,
    bboxWidth,
    bboxHeight,
    initialZoom = null,
  }
) {
  const {boxWidth, boxHeight} = treeLayoutDefaults
  const svg = create('svg')
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('font-family', 'Inter var')
    .attr('font-size', 13)

  const chartContent = svg.append('g').attr('id', 'chart-content')

  // Restore zoom state from previous render if available
  if (initialZoom) {
    svg.node().__zoom = initialZoom
    chartContent.attr('transform', initialZoom.toString())
  }

  // Links join the facing sides of two boxes, slightly inside their edges
  const linkInset = boxWidth / 2 - 10
  chartContent
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', 'var(--grampsjs-body-font-color-70)')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', 1)
    .selectAll('path')
    .data(layout.links)
    .join('path')
    .attr('d', ({source, target}) => {
      const direction = Math.sign(target.x - source.x)
      return link(curveBumpX)({
        source: [source.x + direction * linkInset, source.y],
        target: [target.x - direction * linkInset, target.y],
      })
    })

  const node = chartContent
    .append('g')
    .selectAll('a')
    .data(layout.nodes)
    .join('a')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('filter', d =>
      d.generation === 0
        ? 'drop-shadow(0 3px 8px var(--grampsjs-body-font-color-30))'
        : null
    )

  appendPersonCard(node, {
    profile: d => d.person?.profile,
    handle: d => d.handle,
    imageUrl: getImageUrl,
    boxWidth,
    boxHeight,
    nameDisplayFormat,
    canEdit,
  })

  if (childrenTriangle) {
    const side = orientation === 'LTR' ? -1 : 1
    node
      .filter(d => d.generation === 0)
      .append('path')
      .attr('d', symbol().type(symbolTriangle).size(200))
      .attr(
        'transform',
        `translate(${side * (boxWidth / 2 + 12)},0) rotate(${
          side * 90
        }) scale(-1, 0.5)`
      )
      .attr('fill', 'var(--grampsjs-body-font-color-30)')
      .attr('id', 'triangle-children')
      .on('click', function (e) {
        fireEvent(this, 'pedigree:show-children', {
          pageX: e.pageX,
          pageY: e.pageY,
        })
        e.stopPropagation()
        e.preventDefault()
      })
  }

  const {xMin, xMax, yMin, yMax} = layout.bounds
  svg.attr('viewBox', [
    viewBoxStart(0, xMin, xMax, bboxWidth),
    viewBoxStart(0, yMin, yMax, bboxHeight),
    bboxWidth,
    bboxHeight,
  ])
  return svg.node()
}
