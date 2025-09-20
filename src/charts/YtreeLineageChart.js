import {create} from 'd3-selection'
import {mdiAccount} from '@mdi/js'

const clipString = (s, length) => {
  if (!s) {
    return ''
  }
  const fontSize = 13
  const nChar = length / (fontSize * 0.6)
  if (s.length <= nChar) {
    return s
  }
  if (nChar < 2) {
    return ''
  }
  return `${s.slice(0, nChar - 2)}…`
}

/**
 * Render clade lineage as vertical person boxes connected by a dotted line.
 * @param {Array} chartData - Array of objects {name, year, connectorText, person?}
 * @param {Object} options - Configuration options
 * @param {Function} options.getImageUrl - Function to get image URL for person
 * @returns {SVGElement}
 */
export function YtreeLineageChart(chartData, options = {}) {
  const {getImageUrl = null} = options
  const boxWidth = 250
  const boxHeight = 70
  const gapY = 50
  const padding = 20
  const imgPadding = 10
  const stroke = '#999'
  const strokeWidth = 3
  const strokeDasharray = '3,3'
  const fontFamily = 'Inter var'
  const fontSize = 14

  const extraLabelSpace = 80
  const svgWidth = boxWidth + 2 * padding + extraLabelSpace
  const svgHeight =
    chartData.length * boxHeight + (chartData.length - 1) * gapY + 2 * padding

  const svg = create('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)

  const g = svg.append('g')
  const defs = svg.append('defs')
  const personPath = mdiAccount
  const iconRadius = 24
  const imgRadius = (boxHeight - imgPadding * 2) / 2
  const leftPad = padding
  const boxX = leftPad

  chartData.forEach((item, i) => {
    const y = padding + i * (boxHeight + gapY)
    const group = g.append('g')
    // Draw left blue border
    group
      .append('rect')
      .attr('x', boxX - 4)
      .attr('y', y + 1)
      .attr('width', 24)
      .attr('height', boxHeight - 2)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', 'var(--color-boy)')
    group
      .append('rect')
      .attr('x', boxX)
      .attr('y', y)
      .attr('width', boxWidth)
      .attr('height', boxHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', 'rgba(230,230,230,1)')
    // Draw person icon circle inside the box, or image if available
    const iconCx = boxX + iconRadius + 13
    const iconCy = y + boxHeight / 2
    const imageUrl = getImageUrl && getImageUrl(item)

    if (imageUrl) {
      // Use actual person image
      group
        .append('circle')
        .attr('cx', iconCx)
        .attr('cy', iconCy)
        .attr('r', imgRadius)
        .attr('fill', `url(#imgpattern-${i})`)

      // Create image pattern in defs
      defs
        .append('pattern')
        .attr('id', `imgpattern-${i}`)
        .attr('height', 1)
        .attr('width', 1)
        .attr('x', '0')
        .attr('y', '0')
        .append('image')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', imgRadius * 2)
        .attr('width', imgRadius * 2)
        .attr('xlink:href', imageUrl)
    } else {
      // Use default person icon
      group
        .append('circle')
        .attr('cx', iconCx)
        .attr('cy', iconCy)
        .attr('r', iconRadius)
        .attr('fill', '#bbb')
      group
        .append('path')
        .attr('d', personPath)
        .attr('fill', '#888')
        .attr(
          'transform',
          `translate(${iconCx - 18},${iconCy - 18}) scale(1.5,1.5)`
        )
    }
    // Texts
    const textPadding = imageUrl
      ? 2 * imgRadius + 2 * imgPadding + 8
      : 2 * iconRadius + 30
    const textWidth = imageUrl
      ? boxWidth - 2 * imgPadding - 2 * imgRadius - 8
      : 170

    group
      .append('text')
      .attr('x', boxX + textPadding)
      .attr('y', y + 30)
      .attr('text-anchor', 'start')
      .attr('font-weight', '500')
      .attr('fill', 'var(--grampsjs-body-font-color-90)')
      .text(clipString(item.name, textWidth))
    group
      .append('text')
      .attr('x', boxX + textPadding)
      .attr('y', y + 50)
      .attr('text-anchor', 'start')
      .attr('font-weight', '350')
      .attr('fill', 'var(--grampsjs-body-font-color-90)')
      .text(clipString(item.year, textWidth))
    // Draw connector line and label if not last box
    if (i < chartData.length - 1) {
      const lineY1 = y + boxHeight
      const lineY2 = y + boxHeight + gapY
      const lineX = boxX + 37
      g.append('line')
        .attr('x1', lineX)
        .attr('y1', lineY1)
        .attr('x2', lineX)
        .attr('y2', lineY2)
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-dasharray', strokeDasharray)
      g.append('text')
        .attr('x', lineX + 16)
        .attr('y', (lineY1 + lineY2) / 2 + 5)
        .attr('fill', '#888')
        .attr('font-weight', '370')
        .attr('font-size', fontSize)
        .text(item.connectorText ?? '')
    }
  })

  return svg.node()
}
