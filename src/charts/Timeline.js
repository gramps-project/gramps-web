import {create} from 'd3-selection'
import {scaleTime} from 'd3-scale'
import {axisBottom} from 'd3-axis'
import {zoom as d3zoom, zoomIdentity} from 'd3-zoom'

const MARGIN = {top: 6, right: 20, bottom: 45, left: 20}

// Normalize Gramps locale codes (de_AT → de-AT) for Intl
export function normalizeLocale(locale) {
  return (locale || 'en').replace('_', '-')
}

// Returns the initial [start, end] domain: Jan 1st 100 years ago to now
export function initialDomain(now = new Date()) {
  return [new Date(now.getFullYear() - 100, 0, 1), now]
}

// Choose the right formatter based on how many days are currently visible
export function tickLabel(date, visibleDays, {fmtDay, fmtMonth, fmtYear}) {
  if (visibleDays <= 60) return fmtDay.format(date)
  if (visibleDays <= 3650) return fmtMonth.format(date)
  return fmtYear.format(date)
}

export function Timeline(
  events,
  {width = 800, height = 80, locale = 'en'} = {}
) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)

  const now = new Date()
  const [start, end] = initialDomain(now)

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

  let visibleDays = (end - start) / 86400000

  const axis = axisBottom(x)
    .ticks(Math.max(2, Math.floor(innerWidth / 80)))
    .tickPadding(8)
    .tickFormat(date => tickLabel(date, visibleDays, formatters))

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
  `)

  const axisGroup = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${height - MARGIN.bottom})`)
    .call(axis)
    .style('font-size', '14px')
    .style('font-family', 'var(--grampsjs-body-font-family)')

  const zoomBehavior = d3zoom()
    .scaleExtent([0.1, 1000])
    .on('zoom', ({transform}) => {
      const xNew = transform.rescaleX(x)
      const [d0, d1] = xNew.domain()
      visibleDays = (d1 - d0) / 86400000
      axisGroup.call(axis.scale(xNew))
    })

  svg.call(zoomBehavior)

  return {
    node: svg.node(),
    zoomIn: () => svg.transition().duration(300).call(zoomBehavior.scaleBy, 2),
    zoomOut: () =>
      svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.5),
    reset: () =>
      svg.transition().duration(300).call(zoomBehavior.transform, zoomIdentity),
  }
}
