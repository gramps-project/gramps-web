import {arc as d3arc} from 'd3-shape'
import {create} from 'd3-selection'
import {hierarchy, partition} from 'd3-hierarchy'
import {
  schemePaired,
  interpolateWarm,
  schemeYlOrRd,
  schemeCategory10,
} from 'd3-scale-chromatic'
import {zoom} from 'd3-zoom'
import {LegendCategorical, LegendColorBar} from './util.js'
import {chartNameDisplayFormat} from '../util.js'

const colorFunctions = {
  default: {
    fct: d => {
      if (d.depth === 0) {
        return 'var(--grampsjs-color-shade-120)'
      }
      const ind = Math.min(Math.max(0, Math.floor((d.x0 / Math.PI / 2) * 8)), 8)
      return schemePaired[ind]
    },
  },
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

function getMinMaxNumber(numbers) {
  const filteredNumbers = numbers.filter(x => x !== undefined)
  const min = Math.min(...filteredNumbers)
  const max = Math.max(...filteredNumbers)
  return [min, max]
}

function colorFunctionNumber(d, callback, min, max) {
  const x = callback(d?.data?.person)
  if (x === undefined) {
    return 'var(--grampsjs-color-shade-220)'
  }
  const p = max === min ? 0.5 : (x - min) / (max - min)
  return interpolateWarm(p)
}

function colorFunctionCount(d, callback) {
  const count = callback(d?.data?.person)
  if (count === undefined || count === 0) {
    return 'var(--grampsjs-color-shade-220)'
  }
  return schemeYlOrRd[9][count > 8 ? 8 : count]
  // const p = (count - 1) / 8
  // return interpolateWarm(p > 1 ? 1 : p)
}

function getLegendCategories(categories) {
  const counter = categories
    .filter(cat => cat !== undefined)
    .reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})
  const sortedCounter = Object.entries(counter).sort((a, b) => b[1] - a[1])
  return sortedCounter.map(([cat]) => cat)
}

// change the order of category10 so the last one is gray
const schemeCategorical = [
  ...schemeCategory10.slice(0, 7),
  schemeCategory10[9],
  schemeCategory10[8],
  schemeCategory10[7],
]

function colorFunctionCategory(d, callback, categories) {
  const category = callback(d?.data?.person)
  if (category === undefined) {
    return 'var(--grampsjs-color-shade-220)'
  }
  const index = categories.findIndex(cat => cat === category)
  if (index === -1 || index >= 9) {
    return schemeCategorical[9]
  }
  return schemeCategorical[index]
}

// Finds the bounding rectangle of a list of rectangles
function unionBounds(...bounds) {
  return {
    minX: Math.min(...bounds.map(({minX}) => minX)),
    minY: Math.min(...bounds.map(({minY}) => minY)),
    maxX: Math.max(...bounds.map(({maxX}) => maxX)),
    maxY: Math.max(...bounds.map(({maxY}) => maxY)),
  }
}

// Puts the cartesian coordinates of a polar coordinate into the format of a bounding box
function angleBounds(radius, theta) {
  const x1 = radius * Math.cos(theta)
  const y1 = radius * Math.sin(theta)
  return {minX: x1, minY: y1, maxX: x1, maxY: y1}
}
// Returns true if the treeData contains a real person
function isRealPerson(treeData) {
  return treeData != null && Object.keys(treeData.person).length > 0
}
// Finds the bounding box of the series of arcs that are used to represent the ancestry treeData
function getArcBounds(
  treeData,
  radius,
  // Level of ancestor out from the home person (starting because of math at -1)
  arcLevel = -1,
  // Index into the 2^arcLevel divisions that are made at each level of ancestor
  arcCount = 0,
  currentBounds = {minX: -radius, minY: -radius, maxX: radius, maxY: radius}
) {
  if (!isRealPerson(treeData)) {
    return currentBounds
  }
  if (treeData?.children?.some(isRealPerson)) {
    return unionBounds(
      ...treeData.children.map((child, index) =>
        getArcBounds(
          child,
          radius,
          arcLevel + 1,
          arcCount * 2 + index,
          currentBounds
        )
      )
    )
  }
  // the angle over which this tree arcs, e.g. PI or 180º for the zeroth level, PI / 2 for the first level, etc
  const arcSweep = Math.PI / 2 ** arcLevel

  const minAngle = arcSweep * arcCount - Math.PI
  // check on the begining, middle, and end of the arc
  const anglesToCheck = [minAngle, minAngle + arcSweep / 2, minAngle + arcSweep]
  return unionBounds(
    currentBounds,
    ...anglesToCheck.map(theta => angleBounds(radius * (arcLevel + 2), theta))
  )
}

function mapPersons(data, callback) {
  return (data.person ? [callback(data.person)] : []).concat(
    (data.children || []).reduce(
      (acc, child) => acc.concat(mapPersons(child, callback)),
      []
    )
  )
}

function countPersonMultiplicity(data) {
  const handleCounter = {}
  function countHandleOccurrences(person) {
    if (person.handle) {
      handleCounter[person.handle] = (handleCounter[person.handle] || 0) + 1
    }
  }
  mapPersons(data, countHandleOccurrences)
  return handleCounter
}

export function FanChart(
  data,
  {
    depth = 5,
    arcRadius = 60,
    padding = 3, // separation between arcs
    color = '',
    bboxWidth = 800,
    bboxHeight = 800,
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    strings = {},
  } = {}
) {
  // determine function for coloring people
  const colorFunctionInfo = colorFunctions?.[color] ?? null
  let legendFunction = () => null
  let colorFunction
  let colorOpacity = 0.2
  if (colorFunctionInfo.type === 'number') {
    const numberFunction = colorFunctionInfo.fct
    const numbers = mapPersons(data, person => numberFunction(person))
    const [min, max] = getMinMaxNumber(numbers)
    colorFunction = d => colorFunctionNumber(d, numberFunction, min, max)
    colorOpacity = 0.5
    legendFunction = le =>
      LegendColorBar(le, {opacity: 0.5, maxColorValue: max, minColorValue: min})
  } else if (colorFunctionInfo.type === 'count') {
    const numberFunction = colorFunctionInfo.fct
    colorFunction = d => colorFunctionCount(d, numberFunction)
    colorOpacity = 0.5
    const legendData = [...Array(8).keys()].slice(0, 8).map(i => ({
      label: i,
      color: schemeYlOrRd[9][i],
    }))
    legendData.push({label: '≥ 8', color: schemeYlOrRd[9][8]})
    legendData[0].color = 'var(--grampsjs-color-shade-220)'
    legendFunction = le => LegendCategorical(le, legendData, {opacity: 0.5})
  } else if (colorFunctionInfo.type === 'multiplicity') {
    const multiplicities = countPersonMultiplicity(data)
    colorFunction = d =>
      d.depth === 0
        ? 'var(--grampsjs-color-shade-220)'
        : colorFunctionCount(d, person => multiplicities?.[person?.handle] ?? 0)
    colorOpacity = 0.5
    const legendData = [...Array(8).keys()].slice(0, 8).map(i => ({
      label: i,
      color: schemeYlOrRd[9][i],
    }))
    legendData.push({label: '≥ 8', color: schemeYlOrRd[9][8]})
    legendData[0].color = 'var(--grampsjs-color-shade-220)'
    legendFunction = le => LegendCategorical(le, legendData, {opacity: 0.5})
  } else if (colorFunctionInfo.type === 'category') {
    const catFunction = colorFunctionInfo.fct
    const categories = getLegendCategories(
      mapPersons(data, person => catFunction(person))
    )
    colorFunction = d => colorFunctionCategory(d, catFunction, categories)
    colorOpacity = 0.3
    const legendData = categories.slice(0, 9).map((cat, i) => ({
      label: cat,
      color: schemeCategorical[i],
    }))
    if (categories.length > 9) {
      legendData.push({
        label: strings.Other ?? 'Other',
        color: schemeCategorical[9],
      })
    }
    legendFunction = le => LegendCategorical(le, legendData, {opacity: 0.4})
  } else {
    colorFunction = colorFunctionInfo.fct
  }

  // Create a hierarchical data structure based on the input data
  const root = hierarchy(data)
  const {minX, minY, maxX, maxY} = getArcBounds(data, arcRadius)
  const width = maxX - minX
  const height = maxY - minY
  // Compute the value of each node in the hierarchy
  root.count()
  // Maximum possible radius of the chart
  const radius = depth * arcRadius
  // Create a partition layout and apply it to the root node to produce a radial layout
  // (polar coordinates: x is angle, y is radius)
  partition().size([2 * Math.PI, radius])(root)

  // Construct an arc generator
  const arc = d3arc()
    .startAngle(d => d.x0 - Math.PI / 2) // shifted by 90°
    .endAngle(d => d.x1 - Math.PI / 2) // shifted by 90°
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, (2 * padding) / radius))
    .padRadius(radius / 2)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1 - padding)

  // Construct an arc generator
  const arcStroke = d3arc()
    .startAngle(d => d.x0 - Math.PI / 2) // shifted by 90°
    .endAngle(d => d.x1 - Math.PI / 2) // shifted by 90°
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, (2 * padding) / radius))
    .padRadius(radius / 2)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y0 + 3)

  // center
  const xOffset = -(bboxWidth - width) / 2
  const yOffset = -(bboxHeight - height) / 2

  const svg = create('svg')
    .attr('viewBox', [minX + xOffset, minY + yOffset, bboxWidth, bboxHeight])
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('style', 'max-width: 100%; height: auto;')
    .attr('font-family', 'Inter var')
    .attr('font-size', 12)
    .attr('text-anchor', 'middle')

  const chart = svg.append('g').attr('id', 'chart-content')

  const cell = chart.selectAll('a').data(root.descendants()).join('a')

  function arcVisible(d) {
    return d.name_given !== null
  }

  cell
    .filter(d => arcVisible(d.data))
    .append('path')
    .attr('d', arc)
    .attr('fill', d =>
      colorFunction === null
        ? 'var(--grampsjs-color-shade-200)'
        : colorFunction(d)
    )
    .attr('fill-opacity', colorOpacity)
    .attr('id', d => d.data.id) // Unique id for each slice

  cell
    .filter(d => d.depth > 0)
    .filter(d => arcVisible(d.data))
    .append('path')
    .attr('d', arcStroke)
    .attr('fill', d =>
      d.data.id.slice(-1) === 'm' ? 'var(--color-girl)' : 'var(--color-boy)'
    )
  function clicked(event, d) {
    dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: d.data?.person?.gramps_id},
      })
    )
  }

  cell
    .filter(d => arcVisible(d.data))
    .style('cursor', 'pointer')
    .on('click', clicked)

  const fontSize = d => Math.min(12, (((d.y0 + d.y1) / 2) * (d.x1 - d.x0)) / 10)

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

  cell
    .filter(d => d.depth === 0)
    .append('text')
    .attr(
      'font-weight',
      nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
        ? '500'
        : '300'
    )
    .attr('dy', '-0.6em')
    .text(d =>
      clipString(
        nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
          ? d.data.name_surname
          : d.data.name_given,
        d,
        true
      )
    )

  cell
    .filter(d => d.depth === 0)
    .append('text')
    .attr(
      'font-weight',
      nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
        ? '300'
        : '500'
    )
    .attr('dy', '0.6em')
    .text(d =>
      clipString(
        nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
          ? d.data.name_given
          : d.data.name_surname,
        d,
        true
      )
    )

  const startOffset = d =>
    d.x0 >= Math.PI
      ? (d.y1 + d.y0 / 2) * (d.x1 - d.x0) + (d.y1 - d.y0) - 3.5 * padding
      : (d.y1 * (d.x1 - d.x0)) / 2 - padding

  cell
    .filter(d => d.depth > 0)
    .filter(d => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 50)
    .append('text')
    .attr(
      'font-weight',
      nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
        ? '500'
        : '300'
    )
    .attr('font-size', fontSize)
    .attr('dy', d => (d.y1 - d.y0) / 2 - 7 + 3)
    // .attr("dx", (dx => 1)
    .append('textPath') // append a textPath to the text element
    .attr('xlink:href', d => `#${d.data.id}`)
    .style('text-anchor', 'middle')
    .attr('startOffset', startOffset)
    .style('letter-spacing', d =>
      d.x0 < Math.PI ? `${(1 / d.y1) * 20}em` : `-${(1 / d.y1) * 10}em`
    )
    .text(d =>
      clipString(
        nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
          ? d.data.name_surname || ''
          : d.data.name_given || '',
        d
      )
    )

  cell
    .filter(d => d.depth > 0)
    .filter(d => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 50)
    .append('text')
    .attr(
      'font-weight',
      nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
        ? '300'
        : '500'
    )
    .attr('font-size', fontSize)
    .attr('dy', d => (d.y1 - d.y0) / 2 + 7 + 3)
    // .attr("dx", (dx => 1)
    .append('textPath') // append a textPath to the text element
    .attr('xlink:href', d => `#${d.data.id}`)
    .style('text-anchor', 'middle')
    .attr('startOffset', startOffset)
    .style('letter-spacing', d =>
      d.x0 < Math.PI ? `${(1 / d.y1) * 40}em` : `-${(1 / d.y1) * 15}em`
    )
    .text(
      d =>
        clipString(
          nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
            ? d.data.name_given || ''
            : d.data.name_surname || '',
          d
        )
      // .slice(0, Math.floor(d.y1 * (d.x1 - d.x0) / 10))
    )

  // add legend
  svg
    .append('g')
    .attr('id', 'legend')
    .attr(
      'transform',
      `translate(${minX + xOffset + 60}, ${minY + yOffset + 120})`
    )

  svg.select('#legend').call(legendFunction)
  return svg.node()
}
