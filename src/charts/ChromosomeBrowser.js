import {create, select} from 'd3-selection'
import {scaleLinear} from 'd3-scale'
import {axisTop} from 'd3-axis'

import {categoricalColors, exportPalette} from './palette.js'

const chromosomeLength = {
  1: 249250621,
  2: 243199373,
  3: 198022430,
  4: 191154276,
  5: 180915260,
  6: 171115067,
  7: 159138663,
  8: 146364022,
  9: 141213431,
  10: 135534747,
  11: 135006516,
  12: 133851895,
  13: 115169878,
  14: 107349540,
  15: 102531392,
  16: 90354753,
  17: 81195210,
  18: 78077248,
  19: 59128983,
  20: 63025520,
  21: 48129895,
  22: 51304566,
  X: 155270560,
}

// The chromosome key for a raw chromosome label from a match file
// ("chr7" → "7", "23" → "X"), or null for chromosomes the chart doesn't show.
export function chromosomeKey(label) {
  const key = String(label ?? '')
    .trim()
    .replace(/^chr/i, '')
    .toUpperCase()
  if (key === '23') {
    return 'X'
  }
  return key in chromosomeLength ? key : null
}

// The categorical colours, then the same hues as tints drawn with an outline
// in the full hue
const matchHues = categoricalColors
const matchTints = [
  '#aac9ef',
  '#f7c3ae',
  '#a4dfca',
  '#f8d999',
  '#f6cadb',
  '#99cd99',
  '#c0b9ef',
  '#f4b6b6',
]

// The fill of the match at index i, shared by the chart and its legend.
// Colours repeat after 16 matches.
export function matchColor(i) {
  const slot = i % (2 * matchHues.length)
  return slot < matchHues.length
    ? matchHues[slot]
    : matchTints[slot - matchHues.length]
}

// The outline of the match at index i, or null for none
export function matchStroke(i) {
  const slot = i % (2 * matchHues.length)
  return slot < matchHues.length ? null : matchHues[slot - matchHues.length]
}

// The tracks of a chromosome from top to bottom: paternal, unphased and
// maternal segments
const tracks = ['P', 'U', 'M']

// The track of a segment by its side
const trackOf = side => (side === 'P' || side === 'M' ? side : 'U')

// Assigns each segment of one chromosome the lowest lane of its track in which
// it overlaps no other segment. Returns the lane of each segment, in the order
// given, and the number of lanes of each track: at least one for the paternal
// and maternal tracks, and none for the unphased track without segments.
export function segmentLanes(segments) {
  const ends = {P: [], U: [], M: []}
  const lanes = []
  const order = segments
    .map((segment, i) => i)
    .sort(
      (a, b) =>
        Math.min(segments[a].start, segments[a].stop) -
        Math.min(segments[b].start, segments[b].stop)
    )
  for (const i of order) {
    const {start, stop, side} = segments[i]
    const trackEnds = ends[trackOf(side)]
    let lane = trackEnds.findIndex(end => end <= Math.min(start, stop))
    if (lane === -1) {
      lane = trackEnds.length
    }
    trackEnds[lane] = Math.max(start, stop)
    lanes[i] = lane
  }
  return {
    lanes,
    count: {
      P: Math.max(1, ends.P.length),
      U: ends.U.length,
      M: Math.max(1, ends.M.length),
    },
  }
}

// The outline of a rectangle with its top corners rounded by `top` and its
// bottom corners by `bottom`
function roundedRectPath(width, height, top, bottom) {
  const t = Math.min(top, width / 2, height / 2)
  const b = Math.min(bottom, width / 2, height / 2)
  return [
    `M0,${t}`,
    `A${t},${t} 0 0 1 ${t},0`,
    `H${width - t}`,
    `A${t},${t} 0 0 1 ${width},${t}`,
    `V${height - b}`,
    `A${b},${b} 0 0 1 ${width - b},${height}`,
    `H${b}`,
    `A${b},${b} 0 0 1 0,${height - b}`,
    'Z',
  ].join('')
}

const defaultMargin = {top: 24, right: 10, bottom: 0, left: 35}

// Draws the segments of each match in `data`. A match's `group`, an index
// below `data.length`, picks its colour; it defaults to the match's own index.
// Each chromosome has a paternal track above a maternal one, with a track for
// unphased segments between them if there are any. Overlapping segments of a
// track go into separate, thinner lanes; the paternal lanes grow upwards and
// the others downwards, so the first lanes sit next to each other.
export function ChromosomeBrowser(
  data,
  {
    fontFamily = 'Inter var',
    fontSize = 16,
    fontWeight = 350,
    fontColor = 'var(--grampsjs-body-font-color)',
    width = 800,
    margin = defaultMargin,
    rowGap = 11,
    trackGap = 2,
    laneGap = 2,
    barHeight = 11,
    stackedBarHeight = 7,
    chromosomeRadius = 4,
    tickPadding = 13,
    axisFontSize = 12,
    colorP = '#EEF1F5',
    colorM = '#F9ECEE',
    colorU = '#F2F2F2',
  } = {}
) {
  const segments = data.flatMap((d, i) =>
    (d.segments ?? [])
      .map(segment => ({
        ...segment,
        chromosome: chromosomeKey(segment.chromosome),
        handle: d.handle,
        index: i,
        group: d.group ?? i,
      }))
      .filter(segment => segment.chromosome !== null)
  )

  const trackColor = {P: colorP, U: colorU, M: colorM}
  let y = rowGap
  const rows = Object.keys(chromosomeLength).map(key => {
    const rowSegments = segments.filter(s => s.chromosome === key)
    const {lanes, count} = segmentLanes(rowSegments)
    let top = 0
    const rowTracks = {}
    tracks
      .filter(track => count[track] > 0)
      .forEach(track => {
        const laneHeight = count[track] > 1 ? stackedBarHeight : barHeight
        const height = count[track] * (laneHeight + laneGap) - laneGap
        rowTracks[track] = {
          track,
          top,
          height,
          laneHeight,
          color: trackColor[track],
          key,
        }
        top += height + trackGap
      })
    const row = {
      key,
      y,
      height: top - trackGap,
      tracks: Object.values(rowTracks),
      segments: rowSegments.map((segment, i) => {
        const track = rowTracks[trackOf(segment.side)]
        const offset = lanes[i] * (track.laneHeight + laneGap)
        return {
          ...segment,
          lane: lanes[i],
          y:
            track.track === 'P'
              ? track.top + track.height - track.laneHeight - offset
              : track.top + offset,
          height: track.laneHeight,
          color: matchColor(segment.group),
        }
      }),
    }
    y += row.height + rowGap
    return row
  })
  const height = y

  const svg = create('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('style', 'max-width: 100%; height: auto;')
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)
    .attr('font-weight', fontWeight)

  svg
    .append('defs')
    .selectAll('pattern')
    .data(data)
    .join('pattern')
    .attr('id', (d, i) => `pattern-${i}`)
    .attr('width', 8)
    .attr('height', 8)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)')
    .append('rect')
    .attr('width', 4)
    .attr('height', 8)
    .attr('style', (d, i) => `fill:${matchStroke(i) ?? matchColor(i)}`)

  const node = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  node
    .append('g')
    .attr('class', 'chromosome-axis')
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)
    .attr('fill', fontColor)
    .attr('text-anchor', 'end')
    .selectAll('text')
    .data(rows)
    .join('text')
    .attr('x', -tickPadding)
    .attr('y', row => row.y + row.height / 2)
    .attr('dy', '0.32em')
    .text(row => row.key)

  const x = scaleLinear().domain([0, 249250621]).range([0, width])

  // Labels near the right edge would be clipped by the SVG.
  const xTicks = x
    .ticks(Math.max(2, Math.floor(width / 90)))
    .filter(value => x(value) <= width - 20)

  node
    .append('g')
    .attr('class', 'position-axis')
    .call(
      axisTop(x)
        .tickValues(xTicks)
        .tickSize(4)
        .tickFormat(value => `${value / 1e6} Mb`)
    )
    .attr('font-family', fontFamily)
    .attr('font-size', axisFontSize)
    .attr('color', fontColor)
    .call(g => g.select('.domain').remove())

  const rowNodes = node
    .append('g')
    .selectAll('g')
    .data(rows)
    .join('g')
    .attr('transform', row => `translate(0, ${row.y})`)

  rowNodes
    .selectAll('path.chromosome')
    // Only the outer corners of the chromosome are rounded, so its tracks
    // read as one bar
    .data(row =>
      row.tracks.map((track, i) => ({
        ...track,
        topRadius: i === 0 ? chromosomeRadius : 0,
        bottomRadius: i === row.tracks.length - 1 ? chromosomeRadius : 0,
      }))
    )
    .join('path')
    .attr('class', 'chromosome')
    .attr('transform', d => `translate(0, ${d.top})`)
    .attr('d', d =>
      roundedRectPath(
        x(chromosomeLength[d.key]),
        d.height,
        d.topRadius,
        d.bottomRadius
      )
    )
    .attr('fill', d => d.color)

  rowNodes
    .selectAll('rect.segment')
    .data(row => row.segments)
    .join('rect')
    .attr('class', 'segment')
    .attr('y', d => d.y)
    .attr('x', d => x(Math.min(d.start, d.stop)))
    .attr('rx', 2)
    .attr('width', d => Math.abs(x(d.stop) - x(d.start)))
    .attr('height', d => d.height)
    .attr('fill', d =>
      trackOf(d.side) === 'U' ? `url(#pattern-${d.group})` : d.color
    )
    .attr('stroke', d => matchStroke(d.group))
    .attr('stroke-width', d => (matchStroke(d.group) ? 1 : null))

  return svg.node()
}

// Legend of an exported SVG, in pixels: row height, gap to the chart and an
// estimate of the average character width, since text can't be measured in a
// detached SVG
const legendRowHeight = 22
const legendGap = 20
const legendCharWidth = 7.5

// Returns the chart of `data` as a standalone SVG document with colours from
// `exportPalette` on a white background. `legend` lists the rows to the right
// of the chart, as in the app, as {index, label, detail}, where `index` is the
// colour index and `detail` is shown muted after the label.
export function chromosomeBrowserSvgDocument(data, legend, {width = 800} = {}) {
  const svg = select(
    ChromosomeBrowser(data, {
      width,
      fontFamily: "'Inter var', sans-serif",
      fontWeight: 400,
      fontColor: exportPalette.text,
    })
  )
  const chartWidth = Number(svg.attr('width'))
  const chartHeight = Number(svg.attr('height'))
  const longest = Math.max(
    0,
    ...legend.map(d => `${d.label}${d.detail ?? ''}`.length)
  )
  const legendWidth = legend.length
    ? legendGap + 19 + 8 + longest * legendCharWidth + 10
    : 0
  const fullWidth = chartWidth + legendWidth
  const height = Math.max(
    chartHeight,
    defaultMargin.top + legend.length * legendRowHeight
  )
  svg
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', fullWidth)
    .attr('height', height)
    .attr('viewBox', [0, 0, fullWidth, height].join(' '))
    .attr('style', null)
  svg
    .insert('rect', ':first-child')
    .attr('width', fullWidth)
    .attr('height', height)
    .attr('fill', exportPalette.background)
  const rows = svg
    .append('g')
    .attr(
      'transform',
      `translate(${chartWidth + legendGap}, ${defaultMargin.top})`
    )
    .attr('font-size', 14)
    .selectAll('g')
    .data(legend)
    .join('g')
    .attr('transform', (d, i) => `translate(0, ${i * legendRowHeight})`)
  rows
    .append('rect')
    .attr('y', 4)
    .attr('width', 11)
    .attr('height', 11)
    .attr('rx', 3)
    .attr('fill', d => matchColor(d.index))
    .attr('stroke', d => matchStroke(d.index))
  const text = rows
    .append('text')
    .attr('x', 19)
    .attr('y', 14)
    .attr('fill', exportPalette.legendText)
  text.append('tspan').text(d => d.label)
  text
    .append('tspan')
    .attr('dx', 8)
    .attr('fill', exportPalette.link)
    .text(d => d.detail ?? '')
  const markup = new XMLSerializer().serializeToString(svg.node())
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`
}
