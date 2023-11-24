import {min, max} from 'd3-array'
import {create} from 'd3-selection'
import {hierarchy, tree} from 'd3-hierarchy'
import {curveBumpX, link, symbolTriangle, symbol} from 'd3-shape'
import {zoom} from 'd3-zoom'

// Returns the total depth of the tree
function countDepthOfTree(treeData) {
  if (treeData == null) {
    return 0
  }
  return (
    1 +
    Math.max(
      countDepthOfTree(treeData?.children?.[0]),
      countDepthOfTree(treeData?.children?.[1])
    )
  )
}

function getMinMaxX(descendants) {
  const xValues = descendants.map(d => d.x)
  const maxX = max(xValues)
  const minX = min(xValues)
  return [minX, maxX]
}

export function TreeChart(
  data,
  {
    depth = 3,
    padding = 20, // horizontal padding for first and last column
    gapX = 30, // horizontal gap between boxes
    gapY = 5, // vertical gap between boxes
    stroke = '#555', // stroke for links
    strokeWidth = 1, // stroke width for links
    strokeOpacity = 0.4, // stroke opacity for links
    strokeLinejoin, // stroke line join for links
    strokeLinecap, // stroke line cap for links
    curve = curveBumpX, // curve for the link
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    childrenTriangle = true,
    getImageUrl = null,
    orientation = 'LTR',
  } = {}
) {
  // Create a hierarchical data structure based on the input data
  const root = hierarchy(data)

  const descendants = root.descendants()

  // The true depth of the tree may be less than the passed in "depth" if the tree just doesn't
  // go that far back
  const trueDepth = Math.min(countDepthOfTree(data), depth)

  tree()
    .nodeSize([boxHeight + gapY, boxWidth + gapX])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1))(root)

  // Center the tree.
  let x0 = Infinity
  let x1 = -x0
  root.each(d => {
    if (d.x > x1) x1 = d.x
    if (d.x < x0) x0 = d.x
  })

  if (orientation === 'RTL') {
    descendants.forEach(d => {
      // eslint-disable-next-line no-param-reassign
      d.y = -d.y
    })
  }
  // Use the required curve
  if (typeof curve !== 'function') throw new Error('Unsupported curve')
  const width = trueDepth * boxWidth + (trueDepth - 1) * gapX + 2 * padding
  const [minX, maxX] = getMinMaxX(descendants)
  const height = maxX - minX + boxHeight
  const yOffset = minX - boxHeight / 2
  const xOffset =
    orientation === 'RTL'
      ? boxWidth / 2 + padding - width
      : -boxWidth / 2 - padding

  const svg = create('svg')
    .attr('viewBox', [xOffset - 0.1*width, yOffset, width*1.2, height*1.2])
    .call(zoom().on("zoom", e => svg.select('#chart-content').attr('transform',e.transform) ))
    .attr('font-family', 'Inter var')
    .attr('font-size', 13)

  const chart = svg
    .append('g')
    .attr('id','chart-content')

  chart
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-opacity', strokeOpacity)
    .attr('stroke-linecap', strokeLinecap)
    .attr('stroke-linejoin', strokeLinejoin)
    .attr('stroke-width', strokeWidth)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', d => {
      const sourceX = d.source.x
      const sourceY =
        orientation === 'LTR'
          ? d.source.y + boxWidth / 2 - 10
          : d.source.y - boxWidth / 2 + 10
      const targetX = d.target.x
      const targetY =
        orientation === 'LTR'
          ? d.target.y - boxWidth / 2 + 10
          : d.target.y + boxWidth / 2 - 10

      return link(curve)
        .x(dd => dd.y)
        .y(dd => dd.x)({
        source: {x: sourceX, y: sourceY},
        target: {x: targetX, y: targetY},
      })
    })

  const node = chart
    .append('g')
    .selectAll('a')
    .data(descendants)
    .join('a')
    .attr('transform', d => `translate(${d.y},${d.x})`)

  node
    .append('rect')
    .filter(d => d.data.person)
    .attr('fill', d =>
      d.data.id.slice(-1) === 'm' ? 'var(--color-girl)' : 'var(--color-boy)'
    )
    .attr('width', 24)
    .attr('height', boxHeight - 1)
    .attr('rx', 12)
    .attr('ry', 12)
    .attr(
      'transform',
      `translate(${-boxWidth / 2 - 4},${-boxHeight / 2 + 0.5})`
    )
    .attr('id', d => d.data.id) // Unique id for each rect

  function clicked(event, d) {
    dispatchEvent(
      new CustomEvent('pedigree:person-selected', {
        bubbles: true,
        composed: true,
        detail: {grampsId: d.data?.person?.gramps_id},
      })
    )
  }

  node
    .append('rect')
    .filter(d => d.data.person)
    .attr('fill', 'rgba(230, 230, 230)')
    .attr('width', boxWidth)
    .attr('height', boxHeight)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('transform', `translate(${-boxWidth / 2},${-boxHeight / 2})`)
    .attr('id', d => d.data.id) // Unique id for each slice

  function triangleClicked(e) {
    chart.node().dispatchEvent(
      new CustomEvent('pedigree:show-children', {
        bubbles: true,
        composed: true,
        detail: {pageX: e.pageX, pageY: e.pageY},
      })
    )
    e.stopPropagation()
    e.preventDefault()
  }

  function yPos(d) {
    return orientation === 'LTR'
      ? d.y - boxWidth / 2 - 12
      : d.y + boxWidth / 2 + 12
  }

  if (childrenTriangle) {
    const triangle = symbol().type(symbolTriangle).size(200)

    const angle = orientation === 'LTR' ? -90 : 90

    node
      .append('path')
      .filter(d => d.depth === 0)
      .attr('d', triangle)
      .attr(
        'transform',
        d => `translate(${yPos(d)},${d.x}) rotate(${angle}) scale(-1, 0.5)`
      )
      .attr('fill', '#bbb')
      .attr('id', 'triangle-children')
      .on('click', triangleClicked)
  }

  const imgRadius = (boxHeight - imgPadding * 2) / 2
  const textPadding = d =>
    getImageUrl(d) ? 2 * imgRadius + 2 * imgPadding : 2 * imgPadding

  const clipString = (s, length) => {
    if (!s) {
      return ''
    }
    const fontSize = 13
    const nChar = length / (fontSize * 0.6)
    if (s.length <= nChar) {
      return s
    }
    if (nChar < 2) {
      return ''
    }
    return `${s.slice(0, nChar - 2)}…`
  }

  const textWidth = d =>
    getImageUrl(d)
      ? boxWidth - 2 * imgPadding - 2 * imgRadius
      : boxWidth - 2 * imgRadius

  node
    .append('text')
    .filter(d => d.data.name_surname)
    .attr('y', -boxHeight / 2 + 25)
    .attr('x', d => -boxWidth / 2 + textPadding(d))
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .text(d => clipString(`${d.data.name_surname},`, textWidth(d)))

  node
    .append('text')
    .filter(d => d.data.name_given)
    .attr('y', -boxHeight / 2 + 25 + 17)
    .attr('x', d => -boxWidth / 2 + textPadding(d))
    .attr('width', 50)
    .attr('text-anchor', 'start')
    .attr('font-weight', '500')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .attr('text-overflow', 'ellipsis')
    .attr('overflow', 'hidden')
    .attr('width', 25)
    .text(d => clipString(d.data.name_given, textWidth(d)))

  node
    .append('text')
    .filter(d => d.data.person?.profile?.birth?.date)
    .attr('y', -boxHeight / 2 + 25 + 17 * 2)
    .attr('x', d => -boxWidth / 2 + textPadding(d))
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')
    .attr('paint-order', 'stroke')
    .text(d => clipString(`*${d.data.person.profile.birth.date}`, textWidth(d)))

  node
    .append('text')
    .filter(d => d.data.person?.profile?.death?.date)
    .attr('y', -boxHeight / 2 + 25 + 17 * 3)
    .attr('x', d => -boxWidth / 2 + textPadding(d))
    .attr('text-anchor', 'start')
    .attr('font-weight', '350')
    .attr('fill', 'rgba(0, 0, 0, 0.9)')

    .attr('paint-order', 'stroke')
    .text(d => clipString(`†${d.data.person.profile.death.date}`, textWidth(d)))

  node
    .filter(getImageUrl)
    .append('circle')
    .attr('r', imgRadius)
    .attr('cy', -boxHeight / 2 + imgRadius + imgPadding)
    .attr('cx', -boxWidth / 2 + imgRadius + imgPadding)
    .attr('fill', d => `url(#imgpattern-${d.data.id})`)

  const defs = svg.append('defs')

  const imgPattern = defs
    .selectAll('.imgpattern')
    .data(descendants)
    .enter()
    .append('pattern')
    .attr('id', d => `imgpattern-${d.data.id}`)
    .attr('height', 1)
    .attr('width', 1)
    .attr('x', '0')
    .attr('y', '0')

  imgPattern
    .append('image')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', 70)
    .attr('width', 70)
    .attr('xlink:href', getImageUrl)

  node.style('cursor', 'pointer').on('click', clicked)

  return svg.node()
}
