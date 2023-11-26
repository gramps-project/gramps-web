import {arc as d3arc} from 'd3-shape'
import {create} from 'd3-selection'
import {hierarchy, partition} from 'd3-hierarchy'
import {schemePaired} from 'd3-scale-chromatic'
import {zoom} from 'd3-zoom'

function defaultColor(d) {
  if (d.depth === 0) {
    return 'rgb(120, 120, 120)'
  }
  const ind = Math.min(Math.max(0, Math.floor((d.x0 / Math.PI / 2) * 8)), 8)
  return schemePaired[ind]
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

export function FanChart(
  data,
  {
    depth = 5,
    arcRadius = 60,
    padding = 3, // separation between arcs
    color = defaultColor,
  } = {}
) {
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

  // scale viewport to match more or less the resolution of the window
  const svp = window.innerWidth / (width - minX)
  const svg = create('svg')
    .attr('viewBox', [minX * svp, minY, width * svp, height * svp])
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic;')
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
    .attr('fill', d => (color === null ? 'rgb(150, 150, 150)' : color(d)))
    .attr('fill-opacity', 0.2)
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
    .attr('font-weight', '500')
    .attr('dy', '-0.6em')
    .text(d => clipString(d.data.name_surname, d, true))

  cell
    .filter(d => d.depth === 0)
    .append('text')
    .attr('font-weight', '300')
    .attr('dy', '0.6em')
    .text(d => clipString(d.data.name_given, d, true))

  const startOffset = d =>
    d.x0 >= Math.PI
      ? (d.y1 + d.y0 / 2) * (d.x1 - d.x0) + (d.y1 - d.y0) - 3.5 * padding
      : (d.y1 * (d.x1 - d.x0)) / 2 - padding

  cell
    .filter(d => d.depth > 0)
    .filter(d => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 50)
    .append('text')
    .attr('font-weight', '500')
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
    .text(d => clipString(d.data.name_surname || '', d))

  cell
    .filter(d => d.depth > 0)
    .filter(d => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 50)
    .append('text')
    .attr('font-weight', '300')
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
      d => clipString(d.data.name_given || '', d)
      // .slice(0, Math.floor(d.y1 * (d.x1 - d.x0) / 10))
    )

  return svg.node()
}
