import {create, select} from 'd3-selection'
import {scaleTime} from 'd3-scale'
import {axisBottom} from 'd3-axis'
import {zoom as d3zoom, zoomIdentity} from 'd3-zoom'
import {schemeSet1} from 'd3-scale-chromatic'

const EVENT_TYPE_COLOR = {
  Birth: schemeSet1[0], // red
  Death: schemeSet1[1], // blue
  Marriage: schemeSet1[2], // green
  Baptism: schemeSet1[3], // purple
  Burial: schemeSet1[4], // orange
}
const COLOR_OTHER = schemeSet1[8] // gray

const MARGIN = {top: 6, right: 20, bottom: 45, left: 20}
const DOT_RADIUS = 6
const N_DENSITY_SAMPLES = 200
const DENSITY_BANDWIDTH_FRACTION = 0.05 // bandwidth = 5% of visible range
const LABEL_FONT_SIZE = 13
const LABEL_HEIGHT = 36 // two lines at 13px + spacing
const INITIAL_ZOOM_EVENTS = 10
const LABEL_LEVEL_GAP = 4 // vertical gap between levels
const LABEL_H_GAP = 8 // minimum horizontal gap between labels

// Normalize Gramps locale codes (de_AT → de-AT) for Intl
export function normalizeLocale(locale) {
  return (locale || 'en').replace('_', '-')
}

// Returns the initial [start, end] domain: Jan 1st 100 years ago to now
export function initialDomain(now = new Date()) {
  return [new Date(now.getFullYear() - 100, 0, 1), now]
}

// Choose the right formatter based on the tick date's boundary significance.
// Jan 1 → year only; 1st of any other month → month+year; otherwise → day+month.
// This matches D3's own interval selection so label width always fits tick spacing.
export function tickLabel(date, {fmtDay, fmtMonth, fmtYear}) {
  if (date.getMonth() === 0 && date.getDate() === 1) return fmtYear.format(date)
  if (date.getDate() === 1) return fmtMonth.format(date)
  return fmtDay.format(date)
}

// Compute initial domain from the last N events by date, with padding.
// Falls back to the 100-year range when there aren't enough events.
function computeInitialDomain(validEvents) {
  if (validEvents.length < 2) return initialDomain()
  const sorted = [...validEvents].sort((a, b) => a.jsDate - b.jsDate)
  const recent = sorted.slice(Math.max(0, sorted.length - INITIAL_ZOOM_EVENTS))
  const t0 = recent[0].jsDate.getTime()
  const t1 = recent[recent.length - 1].jsDate.getTime()
  const padding = Math.max((t1 - t0) * 0.1, 30 * 24 * 3600 * 1000) // min 1 month
  return [new Date(t0 - padding), new Date(t1 + padding)]
}

// Epanechnikov kernel — zero outside [-bandwidth, +bandwidth]
function epanechnikov(bandwidth, u) {
  const x = u / bandwidth
  return Math.abs(x) <= 1 ? (0.75 * (1 - x * x)) / bandwidth : 0
}

// Build an SVG path string for a kernel density area.
// baseline: y coordinate of the bottom edge (dot row)
// top: y coordinate of the maximum peak
function buildDensityPath(timestamps, xNew, baseline, top) {
  const [d0, d1] = xNew.domain()
  const t0 = d0.getTime()
  const t1 = d1.getTime()
  const bandwidth = (t1 - t0) * DENSITY_BANDWIDTH_FRACTION
  if (bandwidth === 0 || timestamps.length === 0) return {path: ''}

  // Only events within kernel reach can contribute
  const relevant = timestamps.filter(
    ts => ts >= t0 - bandwidth && ts <= t1 + bandwidth
  )
  if (relevant.length === 0) return {path: ''}

  const step = (t1 - t0) / N_DENSITY_SAMPLES
  let maxDensity = 0
  const densityValues = []

  for (let i = 0; i <= N_DENSITY_SAMPLES; i++) {
    const t = t0 + i * step
    let d = 0
    for (const ts of relevant) d += epanechnikov(bandwidth, t - ts)
    d /= timestamps.length
    densityValues.push(d)
    if (d > maxDensity) maxDensity = d
  }

  if (maxDensity === 0) return {path: ''}

  const scale = (baseline - top) / maxDensity
  const x0 = xNew(d0)
  const x1 = xNew(d1)

  let path = `M ${x0},${baseline}`
  for (let i = 0; i <= N_DENSITY_SAMPLES; i++) {
    const px = xNew(new Date(t0 + i * step))
    const py = baseline - densityValues[i] * scale
    path += ` L ${px},${py}`
  }
  path += ` L ${x1},${baseline} Z`

  return {path}
}

export function Timeline(
  events,
  {
    width = 800,
    height = 80,
    locale = 'en',
    onZoomEnd = null,
    onDotClick = null,
    onDetailClick = null,
  } = {}
) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const validEvents = events.filter(e => e.jsDate != null)

  const [start, end] = computeInitialDomain(validEvents)
  const x = scaleTime().domain([start, end]).range([0, innerWidth])

  const intlLocale = normalizeLocale(locale)
  const formatters = {
    fmtDay: new Intl.DateTimeFormat(intlLocale, {
      day: 'numeric',
      month: 'short',
    }),
    fmtMonth: new Intl.DateTimeFormat(intlLocale, {
      month: 'short',
      year: 'numeric',
    }),
    fmtYear: new Intl.DateTimeFormat(intlLocale, {year: 'numeric'}),
  }

  const axis = axisBottom(x)
    .ticks(Math.max(2, Math.floor(innerWidth / 100)))
    .tickPadding(8)
    .tickFormat(date => tickLabel(date, formatters))

  const svg = create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('style', 'display: block; user-select: none;')

  svg.append('style').text(`
    .domain, .tick line {
      stroke: var(--grampsjs-body-font-color-50);
      stroke-width: 1.5;
    }
    .tick text {
      fill: var(--grampsjs-body-font-color-50);
      font-weight: 550;
    }
    .event-dot {
      opacity: 0.6;
    }
    .density-area {
      fill: var(--md-sys-color-primary);
      opacity: 0.15;
    }
    .event-detail {
      cursor: pointer;
    }
    .detail-line {
      stroke: var(--grampsjs-body-font-color-50);
      stroke-width: 1;
      opacity: 0.35;
    }
    .detail-summary {
      fill: var(--grampsjs-body-font-color);
      font-size: ${LABEL_FONT_SIZE}px;
      font-weight: 550;
      font-family: var(--grampsjs-body-font-family);
    }
    .detail-date {
      fill: var(--grampsjs-body-font-color-50);
      font-size: ${LABEL_FONT_SIZE}px;
      font-family: var(--grampsjs-body-font-family);
    }
  `)

  svg
    .append('defs')
    .append('clipPath')
    .attr('id', 'timeline-data-clip')
    .append('rect')
    .attr('width', innerWidth)
    .attr('height', height - MARGIN.bottom + DOT_RADIUS)

  const axisY = height - MARGIN.bottom
  const dotY = axisY
  const densityBaseline = axisY
  const densityTop = axisY - 32
  let timestamps = validEvents.map(e => e.jsDate.getTime())
  let eventByHandle = new Map(validEvents.map(e => [e.handle, e]))

  let currentX = x

  const dataGroup = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .attr('clip-path', 'url(#timeline-data-clip)')

  const densityPath = dataGroup
    .append('path')
    .attr('class', 'density-area')
    .attr(
      'd',
      buildDensityPath(timestamps, x, densityBaseline, densityTop).path
    )

  const detailGroup = dataGroup.append('g').attr('class', 'detail-group')

  const axisGroup = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${height - MARGIN.bottom})`)
    .call(axis)
    .style('font-size', '14px')
    .style('font-family', 'var(--grampsjs-body-font-family)')

  // Dots appended after the axis so they render on top and remain clickable
  const dotGroup = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .attr('clip-path', 'url(#timeline-data-clip)')

  dotGroup
    .selectAll('.event-dot')
    .data(validEvents, d => d.handle)
    .join('circle')
    .attr('class', 'event-dot')
    .attr('cx', d => x(d.jsDate))
    .attr('cy', dotY)
    .attr('r', DOT_RADIUS)
    .attr('fill', d => EVENT_TYPE_COLOR[d.eventType] ?? COLOR_OTHER)
    .style('cursor', onDotClick ? 'pointer' : null)
    .on(
      'click',
      onDotClick
        ? (event, d) => {
            event.stopPropagation()
            onDotClick(d.handle)
          }
        : null
    )

  function repositionDetails(xScale) {
    const nodes = []
    detailGroup.selectAll('.event-detail').each(function (d) {
      const event = eventByHandle.get(d.handle)
      if (!event?.jsDate) return
      nodes.push({el: this, d, cx: xScale(event.jsDate)})
    })

    nodes.sort((a, b) => b.cx - a.cx)

    const levelRightEdge = []
    for (const {el, cx} of nodes) {
      const textEl = select(el).select('text').node()
      const width = textEl ? textEl.getBBox().width || 0 : 0

      let level = levelRightEdge.findIndex(r => cx >= r + LABEL_H_GAP)
      if (level === -1) level = levelRightEdge.length
      levelRightEdge[level] = cx + 6 + width

      const baseY = densityTop - LABEL_LEVEL_GAP - LABEL_HEIGHT
      const labelY = baseY - level * (LABEL_HEIGHT + LABEL_LEVEL_GAP)
      select(el)
        .select('.detail-line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y2', labelY - LABEL_FONT_SIZE)
      select(el)
        .select('text')
        .attr('x', cx + 6)
        .attr('y', labelY)
      select(el)
        .selectAll('tspan')
        .attr('x', cx + 6)
    }
  }

  function updateDetails(details) {
    detailGroup
      .selectAll('.event-detail')
      .data(Object.values(details), d => d.handle)
      .join(
        enter => {
          const g = enter
            .append('g')
            .attr('class', 'event-detail')
            .style('opacity', 0)
          g.append('line').attr('class', 'detail-line').attr('y1', axisY)
          const text = g.append('text')
          text.append('tspan').attr('class', 'detail-summary').attr('dy', 0)
          text.append('tspan').attr('class', 'detail-date').attr('dy', '1.4em')
          if (onDetailClick) {
            g.on('click', (event, d) => {
              event.stopPropagation()
              onDetailClick(d.gramps_id)
            })
          }
          g.transition().duration(300).style('opacity', 1)
          return g
        },
        update => update,
        exit => exit.transition().duration(200).style('opacity', 0).remove()
      )
      .each(function (d) {
        select(this)
          .select('.detail-summary')
          .text(d.profile?.summary || '')
        select(this)
          .select('.detail-date')
          .text(d.profile?.date || '')
      })
    requestAnimationFrame(() => repositionDetails(currentX))
  }

  let rafId = null
  let pendingTransform = zoomIdentity

  const zoomBehavior = d3zoom()
    .scaleExtent([0.1, 1000])
    .on('zoom', ({transform}) => {
      const xNew = transform.rescaleX(x)
      axisGroup.call(axis.scale(xNew))
      pendingTransform = transform
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const xRaf = pendingTransform.rescaleX(x)
          currentX = xRaf
          dotGroup.selectAll('.event-dot').attr('cx', d => xRaf(d.jsDate))
          const {path} = buildDensityPath(
            timestamps,
            xRaf,
            densityBaseline,
            densityTop
          )
          densityPath.attr('d', path)
          repositionDetails(xRaf)
          rafId = null
        })
      }
    })
    .on('end', ({transform}) => {
      if (onZoomEnd) onZoomEnd(transform.rescaleX(x).domain(), innerWidth)
    })

  svg.call(zoomBehavior)

  if (onDotClick) svg.on('click', () => onDotClick(null))

  if (onZoomEnd)
    requestAnimationFrame(() => onZoomEnd([start, end], innerWidth))

  const pan = dx =>
    svg.transition().duration(200).call(zoomBehavior.translateBy, dx, 0)

  function updateEvents(newEvents) {
    const newValid = newEvents.filter(e => e.jsDate != null)
    timestamps = newValid.map(e => e.jsDate.getTime())
    eventByHandle = new Map(newValid.map(e => [e.handle, e]))
    dotGroup
      .selectAll('.event-dot')
      .data(newValid, d => d.handle)
      .join(
        enter =>
          enter
            .append('circle')
            .attr('class', 'event-dot')
            .attr('cx', d => currentX(d.jsDate))
            .attr('cy', dotY)
            .attr('r', DOT_RADIUS)
            .attr('fill', d => EVENT_TYPE_COLOR[d.eventType] ?? COLOR_OTHER)
            .style('cursor', onDotClick ? 'pointer' : null)
            .on(
              'click',
              onDotClick
                ? (event, d) => {
                    event.stopPropagation()
                    onDotClick(d.handle)
                  }
                : null
            ),
        update => update.attr('cx', d => currentX(d.jsDate)),
        exit => exit.remove()
      )
    const {path} = buildDensityPath(
      timestamps,
      currentX,
      densityBaseline,
      densityTop
    )
    densityPath.attr('d', path)
    if (onZoomEnd) onZoomEnd(currentX.domain(), innerWidth)
  }

  return {
    node: svg.node(),
    updateEvents,
    updateDetails,
    zoomIn: () => svg.transition().duration(300).call(zoomBehavior.scaleBy, 2),
    zoomOut: () =>
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.5),
    reset: () =>
      svg.transition().duration(300).call(zoomBehavior.transform, zoomIdentity),
    panLeft: () => pan(innerWidth * 0.2),
    panRight: () => pan(-innerWidth * 0.2),
  }
}
