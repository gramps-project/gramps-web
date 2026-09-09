// Lifespan (pedigree timeline) chart: each ancestor as a single lifespan bar
// on one shared calendar, clustered by generation (parents, grandparents,
// great-grandparents, ...), colour-coded by sex to match the other tree
// charts, with small on-bar markers for the birth of a child, marriages, and
// death — using the same event-type colours as the Timeline view
// (schemeSet1) and the app's own sex colours elsewhere.

import {create} from 'd3-selection'
import {scaleTime} from 'd3-scale'
import {axisBottom} from 'd3-axis'
import {zoom as d3zoom, zoomIdentity} from 'd3-zoom'
import {schemeSet1} from 'd3-scale-chromatic'
import {mdiGraveStone, mdiAccountOutline, mdiBabyCarriage, mdiInfinity} from '@mdi/js'
import {getPersonByGrampsId, getTree} from './util.js'
import {chartNameDisplayFormat} from '../util.js'

const SEX_COLOR = {
  0: 'var(--color-girl)',
  1: 'var(--color-boy)',
  2: 'var(--color-unknown)',
  3: 'var(--color-other)',
}

const EVENT_COLOR = {
  birth: schemeSet1[0], // matches Timeline's Birth colour
  death: schemeSet1[1], // matches Timeline's Death colour
  marriage: schemeSet1[2], // matches Timeline's Marriage colour
}

// Same neutral "bubble" background used for the person boxes in the other
// tree charts (e.g. the grey ancestor-tree box behind the sex-coloured
// sliver), reused here as the bar fill so the bars read as subtle by default.
const BAR_FILL = 'var(--grampsjs-color-shade-230)'

const MARGIN = {top: 24, right: 30, bottom: 36, left: 220}
const LANE_H = 40
const BAR_H = 18
const FADE_PX = 18
// Extra vertical gap reserved between generation clusters for the divider
// line and headline (e.g. "Parents", "Grandparents").
const HEADER_H = 34

function personDate(person, which) {
  const idx = person?.[`${which}_ref_index`]
  if (idx === undefined || idx === -1) return null
  const event = person?.extended?.events?.[idx]
  const date = event?.date
  if (!date || !date.sortval) return null
  return date
}

// A date counts as uncertain when it's not a plain, regular date — matches
// the definition already used for the "hollow" markers in the Timeline view.
function isUncertain(date) {
  if (!date) return false
  return (date.modifier ?? 0) !== 0 || (date.quality ?? 0) !== 0
}

function sortvalToDate(sortval) {
  // sortval is a serial day number (SDN); JS Date needs a year/month/day.
  // Gramps' own SDN epoch matches the proleptic Julian day count offset
  // used across the app's date utilities, so we convert via a fixed
  // Gregorian epoch (SDN 0 = -4713-11-24) rather than re-deriving it here.
  return new Date((sortval - 2440588) * 86400000)
}

// Generation 0 is the person the chart is centred on ("Central Person", the
// term Gramps itself uses for the root of a pedigree chart), 1 is "Parents",
// 2 is "Grandparents", 3+ prepends "Great-" once per extra step.
function generationLabel(gen) {
  if (gen < 0) return null
  if (gen === 0) return 'Central Person'
  if (gen === 1) return 'Parents'
  if (gen === 2) return 'Grandparents'
  return `${'Great-'.repeat(gen - 2)}grandparents`
}

// Collects every ancestor in the tree, along with the direct parent->child
// edges, using the tree's own father/mother links (tree.children[0] is
// always the father, tree.children[1] the mother — see charts/util.js's
// getTree) rather than any positional ordering, so a rendered connector
// always joins the two people it actually represents.
function flattenAncestors(tree) {
  const nodes = []
  const edges = []
  function visit(node) {
    if (!node || !node.person?.handle) return
    nodes.push({person: node.person, depth: node.depth, id: node.id})
    const father = node.children?.[0]
    const mother = node.children?.[1]
    if (father && father.person?.handle) {
      visit(father)
      edges.push({parent: father, child: node})
    }
    if (mother && mother.person?.handle) {
      visit(mother)
      edges.push({parent: mother, child: node})
    }
  }
  visit(tree)
  return {nodes, edges}
}

function appendMdiIcon(parent, path, {x, y, size = 14, color = 'currentColor'}) {
  const svg = parent
    .append('svg')
    .attr('x', x)
    .attr('y', y)
    .attr('width', size)
    .attr('height', size)
    .attr('viewBox', '0 0 24 24')
  svg.append('path').attr('d', path).attr('fill', color)
  return svg
}

function barPath(x0, x1, top, bot, roundRight) {
  const r = Math.min(5, Math.max(1, (x1 - x0) / 2))
  if (roundRight) {
    return `M${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${
      bot - r
    } Q${x1},${bot} ${x1 - r},${bot} H${x0 + r} Q${x0},${bot} ${x0},${
      bot - r
    } V${top + r} Q${x0},${top} ${x0 + r},${top} Z`
  }
  return `M${x0 + r},${top} H${x1} V${bot} H${x0 + r} Q${x0},${bot} ${x0},${
    bot - r
  } V${top + r} Q${x0},${top} ${x0 + r},${top} Z`
}

function fireHome(target, name, detail) {
  target.dispatchEvent(new CustomEvent(name, {detail}))
}

export function LifespanChart(
  data,
  {
    grampsId,
    depth = 5,
    familyEvents = {},
    bboxWidth = 900,
    bboxHeight = 600,
    initialZoom = null,
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    strings = {},
  } = {}
) {
  const width = Math.max(320, bboxWidth)
  const height = Math.max(320, bboxHeight)

  const {handle} = getPersonByGrampsId(data, grampsId)
  const svg = create('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('width', width)
    .attr('height', height)
  if (!handle) return svg.node()

  const tree = getTree(data, handle, depth, false)
  const {nodes, edges} = flattenAncestors(tree)
  if (!nodes.length) return svg.node()

  // Cluster by generation (oldest ancestors at the top, the person
  // themselves at the bottom, matching "parents above their children"),
  // and within a generation keep the father's side before the mother's
  // side (ahnentafel-style ordering, via the tree's own id labels).
  const sortedNodes = [...nodes].sort((a, b) => {
    if (b.depth !== a.depth) return b.depth - a.depth
    if (a.id === b.id) return 0
    return a.id < b.id ? -1 : 1
  })

  const today = new Date()
  const plotLeft = MARGIN.left
  const plotRight = width - MARGIN.right

  let minDate = today
  let maxDate = today
  sortedNodes.forEach(({person}) => {
    const birth = personDate(person, 'birth')
    const death = personDate(person, 'death')
    if (birth) minDate = Math.min(minDate, sortvalToDate(birth.sortval))
    if (death) maxDate = Math.max(maxDate, sortvalToDate(death.sortval))
  })
  minDate = new Date(minDate)
  maxDate = new Date(Math.max(maxDate, today))
  const span = maxDate - minDate || 1
  minDate = new Date(minDate.getTime() - span * 0.03)
  maxDate = new Date(maxDate.getTime() + span * 0.03)

  const x = scaleTime().domain([minDate, maxDate]).range([plotLeft, plotRight])

  const gRoot = svg.append('g')
  const gAxis = gRoot.append('g').attr('class', 'axis')
  const gToday = gRoot.append('g')
  const gEdges = gRoot.append('g')
  const gBars = gRoot.append('g')
  // labels and cluster headers are drawn at a fixed position each frame
  // (not scaled), so they live outside gRoot and don't need a clip-path
  const gLabels = svg.append('g')
  const gHeaders = svg.append('g')

  const laneY = {}
  const clusterHeaders = []
  let y = MARGIN.top
  let prevDepth
  sortedNodes.forEach(node => {
    if (node.depth !== prevDepth) {
      const label = generationLabel(node.depth)
      if (label) {
        clusterHeaders.push({y: y + HEADER_H / 2, label})
        y += HEADER_H
      }
      prevDepth = node.depth
    }
    laneY[node.person.handle] = y + LANE_H / 2
    y += LANE_H
  })
  const totalHeight = y + MARGIN.bottom
  svg.attr('viewBox', [0, 0, width, totalHeight]).attr('height', totalHeight)

  clusterHeaders.forEach(({y: hy, label}) => {
    gHeaders
      .append('line')
      .attr('x1', 8)
      .attr('x2', width - 8)
      .attr('y1', hy)
      .attr('y2', hy)
      .attr('stroke', 'var(--grampsjs-body-font-color-20)')
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-width', 1)
    gHeaders
      .append('text')
      .attr('x', 12)
      .attr('y', hy + 14)
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.06em')
      .attr('fill', 'var(--grampsjs-body-font-color-50)')
      .text((strings[label] ?? label).toUpperCase())
  })

  function drawAxis(scale) {
    gAxis.attr('transform', `translate(0,${totalHeight - MARGIN.bottom})`)
    gAxis.call(
      axisBottom(scale)
        .ticks(Math.max(3, Math.floor((plotRight - plotLeft) / 90)))
        .tickSizeOuter(0)
    )
    gAxis.selectAll('text').attr('fill', 'var(--grampsjs-body-font-color-60)')
    gAxis.selectAll('line,path').attr('stroke', 'var(--grampsjs-body-font-color-20)')
  }

  function drawFrame(scale) {
    gEdges.selectAll('*').remove()
    gBars.selectAll('*').remove()
    gToday.selectAll('*').remove()
    gLabels.selectAll('*').remove()

    const todayX = scale(today)
    if (todayX >= plotLeft && todayX <= plotRight) {
      gToday
        .append('line')
        .attr('x1', todayX)
        .attr('x2', todayX)
        .attr('y1', MARGIN.top - 10)
        .attr('y2', totalHeight - MARGIN.bottom)
        .attr('stroke', 'var(--md-sys-color-primary)')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6)
    }

    // parent -> child drop lines, anchored to whichever border of each bar
    // actually faces the other bar so the dashed line never runs through
    // (rather than up to the edge of) either one.
    edges.forEach(({parent, child}) => {
      const birth = personDate(child.person, 'birth')
      if (!birth) return
      const parentY = laneY[parent.person.handle]
      const childY = laneY[child.person.handle]
      if (parentY === undefined || childY === undefined) return
      const cx = scale(sortvalToDate(birth.sortval))
      const y1 = parentY < childY ? parentY + BAR_H / 2 : parentY - BAR_H / 2
      const y2 = childY < parentY ? childY + BAR_H / 2 : childY - BAR_H / 2
      gEdges
        .append('line')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', y1)
        .attr('y2', y2)
        .attr('stroke', 'var(--grampsjs-body-font-color-30)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
    })

    sortedNodes.forEach(({person}) => {
      const cy = laneY[person.handle]
      const top = cy - BAR_H / 2
      const bot = cy + BAR_H / 2
      const birth = personDate(person, 'birth')
      const death = personDate(person, 'death')
      const alive = person.death_ref_index === -1 || person.death_ref_index === undefined
      const x0 = scale(birth ? sortvalToDate(birth.sortval) : minDate)
      const x1 = scale(alive ? today : death ? sortvalToDate(death.sortval) : today)
      const color = SEX_COLOR[person.gender] ?? SEX_COLOR[2]

      const g = gBars.append('g')
      g.append('path')
        .attr('d', barPath(x0, x1, top, bot, !alive))
        .attr('fill', BAR_FILL)
        .attr('stroke', 'var(--grampsjs-body-font-color-20)')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', () => fireHome(window, 'pedigree:person-selected', {grampsId: person.gramps_id}))
        .on('mouseenter', function () {
          if (window.matchMedia('(hover: none)').matches) return
          window.dispatchEvent(
            new CustomEvent('object:preview-show', {
              detail: {
                objectType: 'person',
                grampsId: person.gramps_id,
                anchorRect: this.getBoundingClientRect(),
              },
            })
          )
        })
        .on('mouseleave', () => {
          if (window.matchMedia('(hover: none)').matches) return
          window.dispatchEvent(new CustomEvent('object:preview-hide'))
        })

      // sex indicator: a single subtle line along the bottom of the bar,
      // rather than colouring the whole bar
      g.append('rect')
        .attr('x', x0 + 2)
        .attr('y', bot - 2.5)
        .attr('width', Math.max(0, x1 - x0 - 4))
        .attr('height', 2.5)
        .attr('rx', 1.25)
        .attr('fill', color)
        .style('pointer-events', 'none')

      if (isUncertain(birth)) {
        g.append('rect')
          .attr('x', x0)
          .attr('y', top)
          .attr('width', Math.min(FADE_PX, x1 - x0))
          .attr('height', BAR_H)
          .attr('fill', 'url(#lifespan-fade-left)')
          .style('pointer-events', 'none')
      }
      if (!alive && isUncertain(death)) {
        g.append('rect')
          .attr('x', Math.max(x0, x1 - FADE_PX))
          .attr('y', top)
          .attr('width', Math.min(FADE_PX, x1 - x0))
          .attr('height', BAR_H)
          .attr('fill', 'url(#lifespan-fade-right)')
          .style('pointer-events', 'none')
      }

      // end marker: gravestone + age at death, or person + current age
      if (birth) {
        const birthYear = sortvalToDate(birth.sortval).getFullYear()
        const endYear = alive
          ? today.getFullYear()
          : death
            ? sortvalToDate(death.sortval).getFullYear()
            : null
        if (endYear !== null) {
          const age = endYear - birthYear
          appendMdiIcon(g, alive ? mdiAccountOutline : mdiGraveStone, {
            x: x1 + 5,
            y: cy - 6,
            size: 13,
            color: 'var(--grampsjs-body-font-color-60)',
          })
          g.append('text')
            .attr('x', x1 + 20)
            .attr('y', cy + 4)
            .attr('font-size', 10.5)
            .attr('fill', 'var(--grampsjs-body-font-color-60)')
            .text((isUncertain(alive ? null : death) ? '~' : '') + age)
        }
      }

      // birth-of-child markers, using each child's own already-fetched birth
      // date, drawn inside the bar itself rather than floating above it
      const kids = sortedNodes.filter(
        n =>
          n.person?.extended?.primary_parent_family?.father_handle ===
            person.handle ||
          n.person?.extended?.primary_parent_family?.mother_handle ===
            person.handle
      )
      kids.forEach(({person: kid}) => {
        const kidBirth = personDate(kid, 'birth')
        if (!kidBirth) return
        const kx = scale(sortvalToDate(kidBirth.sortval))
        if (kx < x0 + 2 || kx > x1 - 2) return
        appendMdiIcon(g, mdiBabyCarriage, {
          x: kx - 11,
          y: cy - 5,
          size: 10,
          color: 'var(--grampsjs-body-font-color-60)',
        })
        if (birth) {
          const parentAge =
            sortvalToDate(kidBirth.sortval).getFullYear() -
            sortvalToDate(birth.sortval).getFullYear()
          g.append('text')
            .attr('x', kx + 1)
            .attr('y', cy + 3)
            .attr('font-size', 8)
            .attr('fill', 'var(--grampsjs-body-font-color-60)')
            .text(parentAge)
        }
      })

      // marriage marker(s), from the secondary family-events lookup
      ;(person?.extended?.families ?? []).forEach(fam => {
        const marriage = (fam.event_ref_list ?? [])
          .map(ref => familyEvents[ref.ref])
          .find(ev => ev?.type === 'Marriage')
        if (!marriage?.date?.sortval) return
        const mx = scale(sortvalToDate(marriage.date.sortval))
        if (mx < x0 + 2 || mx > x1 - 2) return
        appendMdiIcon(g, mdiInfinity, {
          x: mx - 6,
          y: cy - 6,
          size: 12,
          color: EVENT_COLOR.marriage,
        })
      })

      // name label, left of the plot area
      const label = gLabels.append('g')
      label
        .append('text')
        .attr('x', 12)
        .attr('y', cy - 2)
        .attr('font-size', 12.5)
        .attr('font-weight', 600)
        .attr('fill', 'var(--grampsjs-body-font-color-90)')
        .text(
          (nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
            ? `${person?.profile?.name_surname || ''} ${
                person?.profile?.name_given || ''
              }`
            : `${person?.profile?.name_given || ''} ${
                person?.profile?.name_surname || ''
              }`
          ).trim() || person.gramps_id
        )
      const years = `${birth ? sortvalToDate(birth.sortval).getFullYear() : '?'}–${
        alive ? '' : death ? sortvalToDate(death.sortval).getFullYear() : '?'
      }`
      label
        .append('text')
        .attr('x', 12)
        .attr('y', cy + 12)
        .attr('font-size', 10.5)
        .attr('fill', 'var(--grampsjs-body-font-color-50)')
        .text(years)
    })
  }

  const defs = svg.append('defs')
  const fadeRight = defs
    .append('linearGradient')
    .attr('id', 'lifespan-fade-right')
  fadeRight
    .append('stop')
    .attr('offset', '0')
    .attr('stop-color', BAR_FILL)
    .attr('stop-opacity', '0')
  fadeRight
    .append('stop')
    .attr('offset', '1')
    .attr('stop-color', BAR_FILL)
    .attr('stop-opacity', '1')
  const fadeLeft = defs.append('linearGradient').attr('id', 'lifespan-fade-left')
  fadeLeft
    .append('stop')
    .attr('offset', '0')
    .attr('stop-color', BAR_FILL)
    .attr('stop-opacity', '1')
  fadeLeft
    .append('stop')
    .attr('offset', '1')
    .attr('stop-color', BAR_FILL)
    .attr('stop-opacity', '0')

  const clip = defs.append('clipPath').attr('id', 'lifespan-clip')
  clip
    .append('rect')
    .attr('x', plotLeft)
    .attr('y', 0)
    .attr('width', plotRight - plotLeft)
    .attr('height', totalHeight)
  gEdges.attr('clip-path', 'url(#lifespan-clip)')
  gBars.attr('clip-path', 'url(#lifespan-clip)')
  gToday.attr('clip-path', 'url(#lifespan-clip)')

  drawAxis(x)
  drawFrame(x)

  const zoomBehavior = d3zoom()
    .scaleExtent([1, 40])
    .translateExtent([
      [plotLeft, 0],
      [plotRight, totalHeight],
    ])
    .extent([
      [plotLeft, 0],
      [plotRight, totalHeight],
    ])
    .on('zoom', event => {
      const newScale = event.transform.rescaleX(x)
      drawAxis(newScale)
      drawFrame(newScale)
    })

  svg.call(zoomBehavior)
  if (initialZoom) {
    svg.call(zoomBehavior.transform, initialZoom)
  } else {
    svg.node().__zoom = zoomIdentity
  }

  return svg.node()
}
