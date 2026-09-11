import {min, max} from 'd3-array'
import {create} from 'd3-selection'
import {hierarchy, tree} from 'd3-hierarchy'
import {curveBumpX, link, symbolTriangle, symbol} from 'd3-shape'
import {zoom} from 'd3-zoom'
import {chartNameDisplayFormat, fireEvent} from '../util.js'
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

function getMinMaxX(descendants) {
  const xValues = descendants.map(d => d.x)
  const maxX = max(xValues)
  const minX = min(xValues)
  return [minX, maxX]
}

function TreeChartCore(
  svgParent,
  data,
  {
    depth = 3,
    padding = 20, // horizontal padding for first and last column
    gapX = 30, // horizontal gap between boxes
    gapY = 5, // vertical gap between boxes
    stroke = 'var(--grampsjs-body-font-color-70)', // stroke for links
    strokeWidth = 1, // stroke width for links
    strokeOpacity = 0.4, // stroke opacity for links
    strokeLinejoin, // stroke line join for links
    strokeLinecap, // stroke line cap for links
    curve = curveBumpX, // curve for the link
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    childrenTriangle = true,
    getImageUrl = () => '',
    orientation = 'LTR',
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    canEdit = false,
  } = {}
) {
  // Create a hierarchical data structure based on the input data
  const root = hierarchy(data)

  const descendants = root.descendants()

  // The true depth of the tree may be less than the passed in "depth" if the tree just doesn't
  // go that far back
  const trueDepth = Math.min(root.height + 1, depth)

  tree()
    .nodeSize([boxHeight + gapY, boxWidth + gapX])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1))(root)

  // Center the tree.
  let x0 = Infinity
  let x1 = -x0
  root.each(d => {
    if (d.x > x1) x1 = d.x
    if (d.x < x0) x0 = d.x
  })

  if (orientation === 'RTL') {
    descendants.forEach(d => {
      // eslint-disable-next-line no-param-reassign
      d.y = -d.y
    })
  }
  // Use the required curve
  if (typeof curve !== 'function') throw new Error('Unsupported curve')
  const width = trueDepth * boxWidth + (trueDepth - 1) * gapX + 2 * padding
  const [minX, maxX] = getMinMaxX(descendants)
  const height = maxX - minX + boxHeight
  const yOffset = minX - boxHeight / 2
  const xOffset =
    orientation === 'RTL'
      ? boxWidth / 2 + padding - width
      : -boxWidth / 2 - padding

  const chart = svgParent
    .append('g')
    .attr('transform', `translate(${-xOffset},${0})`)

  chart
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-opacity', strokeOpacity)
    .attr('stroke-linecap', strokeLinecap)
    .attr('stroke-linejoin', strokeLinejoin)
    .attr('stroke-width', strokeWidth)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', d => {
      const sourceX = d.source.x
      const sourceY =
        orientation === 'LTR'
          ? d.source.y + boxWidth / 2 - 10
          : d.source.y - boxWidth / 2 + 10
      const targetX = d.target.x
      const targetY =
        orientation === 'LTR'
          ? d.target.y - boxWidth / 2 + 10
          : d.target.y + boxWidth / 2 - 10

      return link(curve)
        .x(dd => dd.y)
        .y(dd => dd.x)({
        source: {x: sourceX, y: sourceY},
        target: {x: targetX, y: targetY},
      })
    })

  const node = chart
    .append('g')
    .selectAll('a')
    .data(descendants)
    .join('a')
    .attr('transform', d => `translate(${d.y},${d.x})`)
    .style('filter', d =>
      d.depth === 0
        ? 'drop-shadow(0 3px 8px var(--grampsjs-body-font-color-30))'
        : null
    )

  appendPersonCard(node, {
    profile: d => d.data.person?.profile,
    handle: d => d.data.person?.handle,
    imageUrl: getImageUrl,
    boxWidth,
    boxHeight,
    imgPadding,
    nameDisplayFormat,
    canEdit,
  })

  function triangleClicked(e) {
    fireEvent(this, 'pedigree:show-children', {pageX: e.pageX, pageY: e.pageY})
    e.stopPropagation()
    e.preventDefault()
  }

  function yPos(d) {
    return orientation === 'LTR'
      ? d.y - boxWidth / 2 - 12
      : d.y + boxWidth / 2 + 12
  }

  if (childrenTriangle) {
    const triangle = symbol().type(symbolTriangle).size(200)

    const angle = orientation === 'LTR' ? -90 : 90

    node
      .append('path')
      .filter(d => d.depth === 0)
      .attr('d', triangle)
      .attr(
        'transform',
        d => `translate(${yPos(d)},${d.x}) rotate(${angle}) scale(-1, 0.5)`
      )
      .attr('fill', 'var(--grampsjs-body-font-color-30)')
      .attr('id', 'triangle-children')
      .on('click', triangleClicked)
  }

  return [xOffset, yOffset, width, height, boxWidth + 2 * padding]
}

export function TreeChart(dataDescendants, dataAncestors, chartsettings) {
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
  if (chartsettings.initialZoom) {
    svg.node().__zoom = chartsettings.initialZoom
    chartContent.attr('transform', chartsettings.initialZoom.toString())
  }

  // Extent of the chart. Each half is shifted so that the root person box is
  // centred at the origin, which makes zooming scale around the root person.
  let xMin = 0
  let xMax = 0
  let yMin = 0
  let yMax = 0

  if (dataDescendants) {
    const chartD = chartContent.append('g')
    const [, yD, widthD, heightD, overlap] = TreeChartCore(
      chartD,
      dataDescendants,
      {...chartsettings, orientation: 'RTL', depth: chartsettings.nDesc}
    )
    const translateX = overlap / 2 - widthD
    chartD.attr('transform', `translate(${translateX},0)`)
    xMin = Math.min(xMin, translateX)
    xMax = Math.max(xMax, translateX + widthD)
    yMin = Math.min(yMin, yD)
    yMax = Math.max(yMax, yD + heightD)
  }
  if (dataAncestors) {
    const chartA = chartContent.append('g')
    const [, yA, widthA, heightA, overlap] = TreeChartCore(
      chartA,
      dataAncestors,
      {...chartsettings, orientation: 'LTR', depth: chartsettings.nAnc}
    )
    const translateX = -overlap / 2
    chartA.attr('transform', `translate(${translateX},0)`)
    xMin = Math.min(xMin, translateX)
    xMax = Math.max(xMax, translateX + widthA)
    yMin = Math.min(yMin, yA)
    yMax = Math.max(yMax, yA + heightA)
  }

  svg.attr('viewBox', [
    viewBoxStart(0, xMin, xMax, chartsettings.bboxWidth),
    viewBoxStart(0, yMin, yMax, chartsettings.bboxHeight),
    chartsettings.bboxWidth,
    chartsettings.bboxHeight,
  ])
  return svg.node()
}
