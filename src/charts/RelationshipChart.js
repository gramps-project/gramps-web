import {create} from 'd3-selection'
import {linkVertical} from 'd3-shape'
import {zoom} from 'd3-zoom'
import {chartNameDisplayFormat} from '../util.js'
import {layoutRelationships} from './layout/relationshipLayout.js'
import {FamilyGraph} from './model/FamilyGraph.js'
import {chartPalette} from './palette.js'
import {appendPersonCard, setPersonCardInteraction} from './personCard.js'

// Draws the links, person cards and marriage markers of a relationship layout
function drawLayout(
  container,
  layout,
  {
    boxWidth,
    boxHeight,
    imgPadding,
    getImageUrl,
    maxImages,
    nameDisplayFormat,
    canEdit,
    palette,
    rootHandle,
  }
) {
  // A link is a curve from the start to the end of the route Graphviz found.
  // Children who are not birth children are linked with dashes.
  const curve = linkVertical()
  container
    .append('g')
    .attr('class', 'edges')
    .selectAll('path')
    .data(layout.links.filter(link => link.points.length > 0))
    .join('path')
    .attr('class', 'edge')
    .attr('d', ({points}) =>
      curve({source: points[0], target: points[points.length - 1]})
    )
    .attr('fill', 'none')
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', link =>
      link.kind === 'child' && link.relation !== 'Birth' ? '6 4' : null
    )

  // Only the first `maxImages` people with an image show it
  const imageUrls = new Map()
  let imageCount = 0
  for (const node of layout.nodes) {
    if (node.kind === 'person') {
      const url = getImageUrl(node)
      if (url) {
        imageCount += 1
      }
      imageUrls.set(node, imageCount > maxImages ? '' : url)
    }
  }

  const nodes = container
    .append('g')
    .selectAll('g')
    .data(layout.nodes.filter(node => node.kind !== 'placeholder'))
    .join('g')
    .attr('class', node => `node ${node.kind}`)
    .attr('transform', node => `translate(${node.x},${node.y})`)

  const people = nodes.filter(node => node.kind === 'person')
  appendPersonCard(people, {
    profile: node => node.person?.profile,
    imageUrl: node => imageUrls.get(node),
    boxWidth,
    boxHeight,
    imgPadding,
    nameDisplayFormat,
    palette,
  })
  setPersonCardInteraction(people, {
    profile: node => node.person?.profile,
    handle: node => node.handle,
    boxWidth,
    boxHeight,
    canEdit,
    palette,
  })
  people
    .filter(node => node.handle === rootHandle)
    .style('filter', `drop-shadow(0 3px 8px ${palette.shadow})`)

  const married = nodes.filter(
    node => node.kind === 'family' && node.family?.type === 'Married'
  )
  married
    .append('line')
    .attr('class', 'married')
    .attr('x1', -11)
    .attr('x2', 11)
    .attr('y1', boxHeight / 2 - 10)
    .attr('y2', boxHeight / 2 - 10)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('stroke-width', 1)
  married
    .append('circle')
    .attr('class', 'married')
    .attr('r', 6)
    .attr('cy', boxHeight / 2 - 10)
    .attr('stroke', 'var(--grampsjs-body-font-color-40)')
    .attr('fill', 'var(--grampsjs-color-shade-220)')
}

// Returns an SVG with the relationship chart of the people in `data`, centred
// on the person with `grampsId`. The chart is drawn once the layout is ready.
export function RelationshipChart(
  data,
  {
    bboxWidth = 300,
    bboxHeight = 150,
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    getImageUrl = () => '',
    grampsId = 0,
    maxImages = 50,
    shrinkToFit = false,
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    canEdit = false,
    initialZoom = null,
    palette = chartPalette,
  }
) {
  const svg = create('svg')
    .call(
      zoom().on('zoom', e =>
        svg.select('#chart-content').attr('transform', e.transform)
      )
    )
    .attr('font-family', 'Inter var')
    .attr('font-size', 13)

  const chartContent = svg.append('g').attr('id', 'chart-content')

  if (initialZoom) {
    svg.node().__zoom = initialZoom
    chartContent.attr('transform', initialZoom.toString())
  }

  const graph = new FamilyGraph(data)
  const rootHandle = graph.personByGrampsId(grampsId)?.handle
  layoutRelationships(graph, rootHandle, {boxWidth, boxHeight}).then(layout => {
    drawLayout(chartContent.append('g'), layout, {
      boxWidth,
      boxHeight,
      imgPadding,
      getImageUrl,
      maxImages,
      nameDisplayFormat,
      canEdit,
      palette,
      rootHandle,
    })
    svg.attr('viewBox', [
      -bboxWidth / 2,
      -bboxHeight / 2,
      bboxWidth,
      bboxHeight,
    ])
    if (shrinkToFit) {
      const bbox = svg.node().getBBox()
      if (bbox.height > bboxHeight) {
        svg
          .attr('viewBox', [bbox.x, bbox.y - 20, bbox.width, bbox.height + 40])
          .attr('height', bboxHeight)
          .attr('width', bboxWidth)
      }
    }
  })

  return svg.node()
}
