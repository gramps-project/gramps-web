import {arc as d3arc} from 'd3-shape'
import {create} from 'd3-selection'
import {hierarchy, partition} from 'd3-hierarchy'
import {schemePaired} from 'd3-scale-chromatic'

function defaultColor(d) {
  if (d.depth === 0) {
    return 'rgb(120, 120, 120)'
  }
  const ind = Math.min(Math.max(0, Math.floor((d.x0 / Math.PI / 2) * 8)), 8)
  return schemePaired[ind]
}

export function FanChart(
  data,
  {
    width = 600, // outer width, in pixels
    height = 600, // outer height, in pixels
    margin = 1, // shorthand for margins
    marginTop = margin, // top margin, in pixels
    marginRight = margin, // right margin, in pixels
    marginBottom = margin, // bottom margin, in pixels
    marginLeft = margin, // left margin, in pixels
    padding = 3, // separation between arcs
    color = defaultColor,
    radius = Math.min(
      width - marginLeft - marginRight,
      height - marginTop - marginBottom
    ) / 2, // outer radius
  } = {}
) {
  // Create a hierarchical data structure based on the input data
  const root = hierarchy(data)

  // Compute the value of each node in the hierarchy
  root.count()

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

  const svg = create('svg')
    .attr('viewBox', [
      marginRight - marginLeft - width / 2,
      marginBottom - marginTop - height / 2,
      width,
      height,
    ])
    .attr('width', width)
    .attr('height', height)
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic;')
    .attr('font-family', 'Inter var')
    .attr('font-size', 12)
    .attr('text-anchor', 'middle')

  const cell = svg.selectAll('a').data(root.descendants()).join('a')

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
