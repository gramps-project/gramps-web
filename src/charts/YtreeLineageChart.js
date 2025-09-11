import {create} from 'd3-selection'
import {mdiAccount} from '@mdi/js'

function formatYear(yearBeforePresentString, locale) {
  if (!yearBeforePresentString) {
    return ''
  }
  let year = Math.round(2000 - Number(yearBeforePresentString))
  if (Number.isNaN(year)) return ''
  // although this is technically wrong, we are anyway only looking at rounded dates
  if (year < 0) {
    year += 1
  }
  const date = new Date(Date.UTC(year, 0, 1))
  const options = {
    year: 'numeric',
    ...(year <= 0 && {era: 'short'}),
  }
  let formatter
  try {
    formatter = new Intl.DateTimeFormat(locale.replace('_', '-'), options)
  } catch (_) {
    formatter = new Intl.DateTimeFormat('en-US', options)
  }
  return formatter.format(date)
}

/**
 * Render clade lineage as vertical person boxes connected by a dotted line.
 * @param {Array} clades - Array of clade objects (oldest first)
 * @param {Object} [settings] - Chart settings
 * @returns {SVGElement}
 */
export function YtreeLineageChart(clades, settings = {}) {
  const boxWidth = settings.boxWidth ?? 250
  const boxHeight = settings.boxHeight ?? 70
  const gapY = settings.gapY ?? 50
  const padding = settings.padding ?? 20
  const stroke = settings.stroke ?? '#999'
  const strokeWidth = settings.strokeWidth ?? 3
  const strokeDasharray = settings.strokeDasharray ?? '3,3'
  const fontFamily = settings.fontFamily ?? 'Inter var'
  const fontSize = settings.fontSize ?? 14

  const extraLabelSpace = 80
  const svgWidth = boxWidth + 2 * padding + extraLabelSpace
  const svgHeight =
    clades.length * boxHeight + (clades.length - 1) * gapY + 2 * padding

  const svg = create('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)

  const g = svg.append('g')

  // Use mdiAccount from @mdi/js for the person icon
  const personPath = mdiAccount

  const iconRadius = 24
  const leftPad = padding
  const boxX = leftPad
  clades.forEach((clade, i) => {
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
    // Draw person icon circle inside the box
    const iconCx = boxX + iconRadius + 13
    const iconCy = y + boxHeight / 2
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
    // Texts
    group
      .append('text')
      .attr('x', boxX + iconRadius * 2 + 30)
      .attr('y', y + 30)
      .attr('text-anchor', 'start')
      .attr('font-weight', '500')
      .attr('fill', 'rgba(0,0,0,0.9)')
      .text(clade.name)
    group
      .append('text')
      .attr('x', boxX + iconRadius * 2 + 30)
      .attr('y', y + 50)
      .attr('text-anchor', 'start')
      .attr('font-weight', '350')
      .attr('fill', 'rgba(0,0,0,0.9)')
      .text(
        `${formatYear(
          clade.age_info?.formed ?? '',
          settings.locale ?? 'en-US'
        )}`
      )
    if (i < clades.length - 1) {
      // Draw longer connecting line
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
      // Calculate N generations
      let formedCurrent = clade.age_info?.formed ?? ''
      let formedNext = clades[i + 1]?.age_info?.formed ?? ''
      formedCurrent = Number(formedCurrent)
      formedNext = Number(formedNext)
      let nGen = ''
      if (
        !Number.isNaN(formedCurrent) &&
        !Number.isNaN(formedNext) &&
        formedCurrent > 0 &&
        formedNext > 0
      ) {
        nGen = Math.round(Math.abs(formedCurrent - formedNext) / 20)
      }
      // Add label next to line
      g.append('text')
        .attr('x', lineX + 16)
        .attr('y', (lineY1 + lineY2) / 2 + 5)
        .attr('fill', '#888')
        .attr('font-weight', '370')
        .attr('font-size', fontSize)
        .text(
          nGen !== '' ? `${nGen === 0 ? 'few' : `≈ ${nGen}`} generations` : ''
        )
    }
  })

  return svg.node()
}
