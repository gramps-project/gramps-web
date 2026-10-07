import {arc as d3arc} from 'd3-shape'
import {create} from 'd3-selection'
import {
  schemePaired,
  interpolateWarm,
  schemeYlOrRd,
  schemeCategory10,
} from 'd3-scale-chromatic'
import {ChartViewport} from './ChartViewport.js'
import {chartPalette} from './palette.js'
import {LegendCategorical, LegendColorBar, isHoverDevice} from './util.js'
import {chartNameDisplayFormat, fireEvent} from '../util.js'

// Values by which the arcs can be coloured. `fct` returns the value of a
// person, and `type` says how values are mapped to colours.
export const fanColorModes = {
  default: {},
  nEvents: {
    type: 'count',
    fct: person => person?.event_ref_list?.length,
  },
  nNotes: {
    type: 'count',
    fct: person => person?.note_list?.length,
  },
  nPaths: {
    type: 'multiplicity',
  },
  birthYear: {
    type: 'number',
    fct: person =>
      person?.extended?.events?.[person?.birth_ref_index]?.date?.year ||
      undefined,
  },
  deathYear: {
    type: 'number',
    fct: person =>
      person?.extended?.events?.[person?.death_ref_index]?.date?.year ||
      undefined,
  },
  age: {
    type: 'number',
    fct: person => {
      let dBirth = person?.extended?.events?.[person?.birth_ref_index]?.date
      dBirth =
        // only normal dates, no spans etc., quality not estimated
        dBirth !== undefined && dBirth.modifier === 0 && dBirth.quality !== 1
          ? dBirth.sortval || undefined
          : undefined
      let dDeath = person?.extended?.events?.[person?.death_ref_index]?.date
      dDeath =
        dDeath !== undefined && dDeath.modifier === 0 && dDeath.quality !== 1
          ? dDeath.sortval || undefined
          : undefined
      if (dBirth === undefined || dDeath === undefined) {
        return undefined
      }
      return (dDeath - dBirth) / 365.25
    },
  },
  surname: {
    type: 'category',
    fct: person => {
      const surname = person?.primary_name?.surname_list?.[0]
      if (surname === undefined) {
        return undefined
      }
      return `${surname.prefix} ${surname.surname}`.trim()
    },
  },
  religion: {
    type: 'category',
    fct: person =>
      person?.extended?.events?.filter(event => event?.type === 'Religion')?.[0]
        ?.description,
  },
}

// The colours of category10, reordered so that the last one is grey
const schemeCategorical = [
  ...schemeCategory10.slice(0, 7),
  schemeCategory10[9],
  schemeCategory10[8],
  schemeCategory10[7],
]

// The colour of a count from 1, with 8 and above sharing the last colour
const countColor = count => schemeYlOrRd[9][count > 8 ? 8 : count]

// Returns the categories of `values` from most to least frequent
function categoriesByFrequency(values) {
  const counter = values
    .filter(value => value !== undefined)
    .reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
}

// The legend of the counts 0 to 8 and above
function countLegend(palette) {
  const legendData = [...Array(8).keys()].map(i => ({
    label: i,
    color: schemeYlOrRd[9][i],
  }))
  legendData.push({label: '≥ 8', color: schemeYlOrRd[9][8]})
  legendData[0].color = palette.fanNoValue
  return legend =>
    LegendCategorical(legend, legendData, {
      opacity: 0.5,
      textColor: palette.legendText,
    })
}

// Returns the colour of each arc by node, its opacity and the legend of the
// colour mode `color` for the people in `nodes`
function colorScheme(nodes, color, palette, otherLabel) {
  const mode = fanColorModes[color] ?? fanColorModes.default
  const people = nodes.map(node => node.person)
  const noLegend = () => null
  if (mode.type === 'number') {
    const values = people.map(mode.fct).filter(x => x !== undefined)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      fill: node => {
        const x = mode.fct(node.person)
        if (x === undefined) {
          return palette.fanNoValue
        }
        return interpolateWarm(max === min ? 0.5 : (x - min) / (max - min))
      },
      opacity: 0.5,
      legend: legend =>
        LegendColorBar(legend, {
          opacity: 0.5,
          maxColorValue: max,
          minColorValue: min,
          textColor: palette.legendText,
        }),
    }
  }
  if (mode.type === 'count') {
    return {
      fill: node => {
        const count = mode.fct(node.person)
        return count ? countColor(count) : palette.fanNoValue
      },
      opacity: 0.5,
      legend: countLegend(palette),
    }
  }
  if (mode.type === 'multiplicity') {
    const multiplicities = {}
    for (const {handle} of people) {
      if (handle) {
        multiplicities[handle] = (multiplicities[handle] ?? 0) + 1
      }
    }
    return {
      fill: node => {
        const count = multiplicities[node.person?.handle] ?? 0
        return node.generation === 0 || !count
          ? palette.fanNoValue
          : countColor(count)
      },
      opacity: 0.5,
      legend: countLegend(palette),
    }
  }
  if (mode.type === 'category') {
    const categories = categoriesByFrequency(people.map(mode.fct))
    const legendData = categories.slice(0, 9).map((category, i) => ({
      label: category,
      color: schemeCategorical[i],
    }))
    if (categories.length > 9) {
      legendData.push({label: otherLabel, color: schemeCategorical[9]})
    }
    return {
      fill: node => {
        const category = mode.fct(node.person)
        if (category === undefined) {
          return palette.fanNoValue
        }
        const index = categories.indexOf(category)
        return schemeCategorical[index === -1 || index >= 9 ? 9 : index]
      },
      opacity: 0.3,
      legend: legend =>
        LegendCategorical(legend, legendData, {
          opacity: 0.4,
          textColor: palette.legendText,
        }),
    }
  }
  // Each eighth of the circle has its own colour
  return {
    fill: node =>
      node.generation === 0
        ? palette.fanRoot
        : schemePaired[
            Math.min(Math.max(0, Math.floor((node.x0 / Math.PI / 2) * 8)), 8)
          ],
    opacity: 0.2,
    legend: noLegend,
  }
}

// Offset of the legend from the top left corner of the view, in pixels
const legendOffset = [60, 152]

// Draws layouts from `layoutFan` into an SVG that is created once. Each update
// draws the arcs again; the zoom transform is kept as described for
// `ChartViewport.show`.
export class FanChart {
  constructor() {
    this._svg = create('svg')
      .attr('font-family', 'Inter var')
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
    this._content = this._svg.append('g').attr('id', 'chart-content')
    this._viewport = new ChartViewport(this._svg, this._content)
    this._legend = this._svg.append('g').attr('id', 'legend')
    this._layout = undefined
  }

  get node() {
    return this._svg.node()
  }

  get viewport() {
    return this._viewport
  }

  // Removes the chart and the legend, keeping the zoom transform
  clear() {
    this._content.selectChildren().remove()
    this._legend.selectChildren().remove()
  }

  // Draws `layout`, with the arcs coloured by the colour mode `color` from
  // `fanColorModes` and its legend in the top left corner of the view. A
  // legend with more categories than colours ends with `otherLabel`. Without
  // `interactive`, arcs have no click or hover handling or cursor. Colours
  // other than those of the colour modes come from `palette`.
  update(
    layout,
    {
      color = 'default',
      nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
      otherLabel = 'Other',
      interactive = true,
      palette = chartPalette,
      padding = 3,
      fit = false,
      bboxWidth,
      bboxHeight,
    } = {}
  ) {
    const newLayout = layout !== this._layout
    this._layout = layout
    const root = layout.nodes.find(node => node.generation === 0)
    this._viewport.show({
      bounds: layout.bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle: root?.handle,
      positions: new Map(),
      fit,
      newLayout,
    })
    this.clear()
    const scheme = colorScheme(layout.nodes, color, palette, otherLabel)
    this._drawArcs(layout, {
      scheme,
      nameDisplayFormat,
      interactive,
      palette,
      padding,
    })
    const [x, y] = this._viewport.viewStart
    this._legend
      .attr(
        'transform',
        `translate(${x + legendOffset[0]}, ${y + legendOffset[1]})`
      )
      .call(scheme.legend)
  }

  _drawArcs(
    layout,
    {scheme, nameDisplayFormat, interactive, palette, padding}
  ) {
    // The outermost radius of the layout
    const radius = Math.max(...layout.nodes.map(node => node.y1))
    const arcOf = outerRadius =>
      d3arc()
        .startAngle(d => d.x0 - Math.PI / 2)
        .endAngle(d => d.x1 - Math.PI / 2)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, (2 * padding) / radius))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(outerRadius)
    const arc = arcOf(d => d.y1 - padding)
    // A stripe in the colour of the side at the inner edge of each arc
    const sideStripe = arcOf(d => d.y0 + 3)

    // Unknown ancestors are not drawn
    const cells = this._content
      .selectAll('g')
      .data(layout.nodes.filter(node => node.person?.profile))
      .join('g')
      .attr('class', 'fan-cell')

    cells
      .append('path')
      .attr('d', arc)
      .attr('fill', scheme.fill)
      .attr('fill-opacity', scheme.opacity)
      .attr('id', d => d.key)

    cells
      .filter(d => d.generation > 0)
      .append('path')
      .attr('d', sideStripe)
      .attr('fill', d => (d.side === 'mother' ? palette.sex.F : palette.sex.M))

    if (interactive) {
      setFanInteraction(cells)
    }
    appendNames(cells, {nameDisplayFormat, palette, padding})
  }
}

// Selects the person of an arc when it is clicked, and shows a preview of
// the person while the pointer is on it
function setFanInteraction(cells) {
  cells
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      fireEvent(this, 'pedigree:person-selected', {
        grampsId: d.person?.gramps_id,
      })
    })
    .on('mouseenter', function (event, d) {
      const grampsId = d.person?.gramps_id
      if (!grampsId || !isHoverDevice()) {
        return
      }
      fireEvent(window, 'object:preview-show', {
        objectType: 'person',
        grampsId,
        anchorRect: this.getBoundingClientRect(),
        chart: true,
      })
    })
    .on('mouseleave', () => {
      if (isHoverDevice()) {
        fireEvent(window, 'object:preview-hide')
      }
    })
}

// Appends the names of the people: two lines across the centre for the root
// person, and two lines along the arc for ancestors whose arc is long enough
function appendNames(cells, {nameDisplayFormat, palette, padding}) {
  const surnameFirst =
    nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
  const [firstName, secondName] = surnameFirst
    ? [p => p.name_surname, p => p.name_given]
    : [p => p.name_given, p => p.name_surname]
  const [firstWeight, secondWeight] = surnameFirst ? [500, 300] : [300, 500]

  const fontSize = d => Math.min(12, (((d.y0 + d.y1) / 2) * (d.x1 - d.x0)) / 10)
  // Shortens `s` to fit the arc of `d`, or the disc of the root person
  const clipString = (s, d, isCenter = false) => {
    const length = isCenter
      ? 2 * d.y1
      : ((d.x1 - d.x0) * (d.y1 + d.y0)) / 2 - padding
    const nChar = length / (fontSize(d) * 0.6)
    if (s.length <= nChar) {
      return s
    }
    if (nChar < 2) {
      return ''
    }
    return `${s.slice(0, nChar - 2)}…`
  }

  const centre = cells.filter(d => d.generation === 0)
  const profile = d => d.person.profile
  centre
    .append('text')
    .style('fill', palette.fanText)
    .attr('font-weight', firstWeight)
    .attr('dy', '-0.6em')
    .text(d => clipString(firstName(profile(d)) || '', d, true))
  centre
    .append('text')
    .style('fill', palette.fanText)
    .attr('font-weight', secondWeight)
    .attr('dy', '0.6em')
    .text(d => clipString(secondName(profile(d)) || '', d, true))

  // Text along the arc starts in its middle, and reads clockwise in the
  // upper half and counterclockwise in the lower half
  const startOffset = d =>
    d.x0 >= Math.PI
      ? (d.y1 + d.y0 / 2) * (d.x1 - d.x0) + (d.y1 - d.y0) - 3.5 * padding
      : (d.y1 * (d.x1 - d.x0)) / 2 - padding
  const ancestors = cells
    .filter(d => d.generation > 0)
    .filter(d => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 50)
  const lines = [
    {name: firstName, weight: firstWeight, dy: -7, spacing: [20, 10]},
    {name: secondName, weight: secondWeight, dy: 7, spacing: [40, 15]},
  ]
  for (const {name, weight, dy, spacing} of lines) {
    ancestors
      .append('text')
      .style('fill', palette.fanText)
      .attr('font-weight', weight)
      .attr('font-size', fontSize)
      .attr('dy', d => (d.y1 - d.y0) / 2 + dy + 3)
      .append('textPath')
      .attr('xlink:href', d => `#${d.key}`)
      .style('fill', palette.fanText)
      .style('text-anchor', 'middle')
      .attr('startOffset', startOffset)
      .style('letter-spacing', d =>
        d.x0 < Math.PI
          ? `${(1 / d.y1) * spacing[0]}em`
          : `-${(1 / d.y1) * spacing[1]}em`
      )
      .text(d => clipString(name(profile(d)) || '', d))
  }
}
