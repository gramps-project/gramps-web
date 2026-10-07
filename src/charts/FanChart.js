import {arc as d3arc} from 'd3-shape'
import {create, local, select} from 'd3-selection'
import {
  schemePaired,
  interpolateWarm,
  schemeYlOrRd,
  schemeCategory10,
} from 'd3-scale-chromatic'
import {ChartViewport} from './ChartViewport.js'
import {joinWithTransitions, transitionColor} from './animatedJoin.js'
import {invertFrame, placeArc, relateFanLayouts} from './layout/fanLayout.js'
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

// The angles and radii each arc moves `from` and `to`. They can be outside
// the circle while the arc moves in or out of the chart.
const arcMotion = local()

// Returns the arc at `t` of the way from `from` to `to`
const interpolateArc = (from, to, t) => ({
  x0: from.x0 + (to.x0 - from.x0) * t,
  x1: from.x1 + (to.x1 - from.x1) * t,
  y0: from.y0 + (to.y0 - from.y0) * t,
  y1: from.y1 + (to.y1 - from.y1) * t,
})

// Returns `arc` with its angles within the circle and its radii not negative
function clampArc({x0, x1, y0, y1}) {
  const clamp = x => Math.min(Math.max(x, 0), 2 * Math.PI)
  return {
    x0: clamp(x0),
    x1: clamp(x1),
    y0: Math.max(y0, 0),
    y1: Math.max(y1, 0),
  }
}

// Returns the path generators of the arcs of `layout`, with `padding`
// between them, and of the stripe in the colour of the side at the inner
// edge of each arc
function arcShape(layout, padding) {
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
  return {
    arc: arcOf(d => Math.max(d.y0, d.y1 - padding)),
    sideStripe: arcOf(d => d.y0 + 3),
  }
}

// Draws layouts from `layoutFan` into an SVG that is created once. The zoom
// transform is kept as described for `ChartViewport.show`.
//
// When the root person of a new layout is an ancestor or descendant of the
// previous root person, the arcs move as in a zoomable sunburst: the
// ancestor's arc widens to the full circle, or the full circle narrows to the
// arc of the descendant, and the arcs that are in only one of the layouts
// move in or out of the circle. The origin stays in place if it is in view.
// A layout of the same root person that arrives while the arcs move, such as
// one with more ancestors, joins the movement.
export class FanChart {
  constructor() {
    this._svg = create('svg')
      .attr('font-family', 'Inter var')
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
    this._content = this._svg.append('g').attr('id', 'chart-content')
    this._viewport = new ChartViewport(this._svg, this._content)
    this._legend = this._svg.append('g').attr('id', 'legend')
    // The drawn layout, to which the next one is related
    this._layout = undefined
    // The movement of the arcs while they move: the frame from where they
    // started to the current layout, and how far they have moved
    this._motion = null
    // The arc that last related two root people, or the last clicked arc, as
    // described for `relateFanLayouts`. It names both people, so it stays
    // valid when the chart is cleared or the data changes.
    this._lineageArc = undefined
    this._arcShape = null
    this._nameOptions = {}
  }

  get node() {
    return this._svg.node()
  }

  get viewport() {
    return this._viewport
  }

  // Removes the chart and the legend, keeping the zoom transform. The next
  // layout is not related to the removed one.
  clear() {
    this._content.interrupt('arc')
    this._motion = null
    this._layout = undefined
    this._content.selectChildren().remove()
    this._legend.selectChildren().remove()
  }

  // Draws `layout`, with the arcs coloured by the colour mode `color` from
  // `fanColorModes` and its legend in the top left corner of the view. A
  // legend with more categories than colours ends with `otherLabel`. Without
  // `interactive`, arcs have no click or hover handling or cursor. Colours
  // other than those of the colour modes come from `palette`. Arcs move and
  // change colour over `duration` milliseconds, and names are drawn once the
  // arcs have stopped moving.
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
      duration = 0,
      bboxWidth,
      bboxHeight,
    } = {}
  ) {
    const newLayout = layout !== this._layout
    const relation = relateFanLayouts(this._layout, layout, {
      lineageArc: this._lineageArc,
    })
    this._lineageArc = relation.lineageArc ?? this._lineageArc
    this._layout = layout
    const [root] = layout.nodes
    // The origin is the centre of both layouts
    const origin = [0, 0]
    this._viewport.show({
      bounds: layout.bounds,
      size: [bboxWidth, bboxHeight],
      rootHandle: root.handle,
      candidates:
        relation.kind === 'lineage' ? [{key: 'origin', position: origin}] : [],
      positions: new Map([['origin', origin]]),
      fit,
      newLayout,
    })
    const scheme = colorScheme(layout.nodes, color, palette, otherLabel)
    this._arcShape = arcShape(layout, padding)
    this._nameOptions = {nameDisplayFormat, palette, padding}
    const cells = this._joinArcs(layout, relation, duration)
    this._colorArcs(cells, {scheme, palette, duration})
    setFanInteraction(cells, {
      interactive,
      onClick: arc => {
        this._lineageArc = {
          descendant: root.handle,
          ancestor: arc.handle,
          key: arc.key,
        }
      },
    })
    const [x, y] = this._viewport.viewStart
    this._legend.selectChildren().remove()
    this._legend
      .attr(
        'transform',
        `translate(${x + legendOffset[0]}, ${y + legendOffset[1]})`
      )
      .call(scheme.legend)
  }

  // Joins the arcs of `layout` and moves them. For a layout of the same root
  // person, the arcs continue the current movement. Otherwise they start a
  // new one from where they are drawn, which is animated for a layout
  // related by `relation.kind` 'lineage' and drawn at its end for others.
  // Returns the cells of the arcs.
  _joinArcs(layout, relation, duration) {
    const continues =
      duration > 0 && relation.kind === 'sameRoot' && this._motion !== null
    const frame = continues ? this._motion.frame : relation.frame
    if (!continues) {
      // Every arc, also one that is leaving, moves from where it is drawn
      const t = this._motion?.t ?? 1
      this._content.selectChildren('g').each(function () {
        const {from, to} = arcMotion.get(this)
        const now = interpolateArc(from, to, t)
        arcMotion.set(this, {from: now, to: placeArc(now, frame)})
      })
    }
    // New arcs start where they are in the frame the movement started in
    const back = invertFrame(frame)
    // Unknown ancestors are not drawn
    const cells = joinWithTransitions(
      this._content,
      '.fan-cell',
      layout.nodes.filter(node => node.person?.profile),
      {
        key: node => node.key,
        previousKey: relation.key,
        enter: enter => {
          const entering = enter.append('g').attr('class', 'fan-cell')
          entering.append('path').attr('class', 'fan-arc')
          entering.append('path').attr('class', 'fan-side')
          return entering.each(function (d) {
            arcMotion.set(this, {from: placeArc(d, back), to: d})
          })
        },
        exit: exit => {
          exit.selectAll('text').remove()
          exit.select('.fan-arc').attr('id', null)
        },
        duration,
      }
    ).each(function (d) {
      arcMotion.set(this, {...arcMotion.get(this), to: d})
    })
    cells.select('.fan-arc').attr('id', d => d.key)

    cells.selectAll('text').remove()
    if (continues) {
      this._drawArcs(this._motion.t)
    } else if (duration > 0 && relation.kind === 'lineage') {
      this._startMotion(frame, duration)
    } else {
      this._content.interrupt('arc')
      this._motion = null
      this._drawArcs(1)
      this._drawNames()
    }
    return cells
  }

  // Fills the arcs with the colours of `scheme`, changing over `duration`
  // milliseconds, and colours the side stripes
  _colorArcs(cells, {scheme, palette, duration}) {
    const arcs = cells.select('.fan-arc').interrupt('fill')
    // New arcs start with their colour
    arcs
      .filter(function () {
        return !this.hasAttribute('fill')
      })
      .attr('fill', scheme.fill)
    if (duration > 0) {
      const fill = arcs.transition('fill').duration(duration)
      transitionColor(fill, 'fill', scheme.fill)
      fill.attr('fill-opacity', scheme.opacity)
    } else {
      arcs.attr('fill', scheme.fill).attr('fill-opacity', scheme.opacity)
    }
    cells
      .select('.fan-side')
      .attr('display', d => (d.generation > 0 ? null : 'none'))
      .attr('fill', d => (d.side === 'mother' ? palette.sex.F : palette.sex.M))
  }

  // Moves the arcs over `duration` milliseconds, and draws the names when
  // they stop. `frame` maps where the arcs start to the current layout.
  _startMotion(frame, duration) {
    const motion = {frame, t: 0}
    this._motion = motion
    this._content
      .interrupt('arc')
      .transition('arc')
      .duration(duration)
      .tween('arc', () => t => {
        motion.t = t
        this._drawArcs(t)
      })
      .on('end', () => {
        this._motion = null
        this._drawNames()
      })
  }

  // Draws each arc, also those that are leaving, at `t` of its movement
  _drawArcs(t) {
    const {arc, sideStripe} = this._arcShape
    this._content.selectChildren('g').each(function () {
      const {from, to} = arcMotion.get(this)
      const clamped = clampArc(interpolateArc(from, to, t))
      const cell = select(this)
      cell.select('.fan-arc').attr('d', arc(clamped))
      cell.select('.fan-side').attr('d', sideStripe(clamped))
    })
  }

  _drawNames() {
    const cells = this._content.selectChildren('.fan-cell')
    cells.selectAll('text').remove()
    appendNames(cells, this._nameOptions)
  }
}

// Selects the person of an arc when it is clicked, after calling
// `onClick(node)` with the node of the arc, and shows a preview of the person
// while the pointer is on it. Without `interactive`, arcs have no click or
// hover handling.
function setFanInteraction(cells, {interactive, onClick}) {
  if (!interactive) {
    cells
      .style('cursor', null)
      .on('click', null)
      .on('mouseenter', null)
      .on('mouseleave', null)
    return
  }
  cells
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      onClick(d)
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
