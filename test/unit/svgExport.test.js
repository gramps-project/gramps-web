import {describe, it, expect} from 'vitest'
import {TreeChart} from '../../src/charts/TreeChart.js'
import {RelationshipChart} from '../../src/charts/RelationshipChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutAncestors} from '../../src/charts/layout/treeLayout.js'
import {layoutRelationships} from '../../src/charts/layout/relationshipLayout.js'
import {exportPalette} from '../../src/charts/palette.js'
import {chartSvgDocument} from '../../src/charts/svgExport.js'

const family = (handle, father, mother, children) => ({
  handle,
  type: 'Married',
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(ref => ({ref, frel: 'Birth', mrel: 'Birth'})),
})

const person = (handle, extended = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  media_list: [{ref: `media_${handle}`}],
  profile: {
    gramps_id: `I_${handle}`,
    name_given: `Given${handle}`,
    name_surname: `Sur${handle}`,
    sex: 'F',
  },
  extended: {families: [], ...extended},
})

// R has parents F and M
const fR = family('fR', 'F', 'M', ['R'])
const graph = new FamilyGraph([
  person('R', {primary_parent_family: fR}),
  person('F', {families: [fR]}),
  person('M', {families: [fR]}),
])

// The options a live chart is drawn with, including everything that an
// export leaves out
const liveOptions = {
  getImageUrl: () => 'https://example.com/thumbnail?jwt=secret',
  childrenTriangle: true,
  canEdit: true,
  duration: 400,
  bboxWidth: 800,
  bboxHeight: 600,
}

const parse = content =>
  new DOMParser().parseFromString(content, 'image/svg+xml').documentElement

describe('chartSvgDocument', () => {
  const layout = layoutAncestors(graph, 'R', {depth: 2})
  const content = chartSvgDocument(TreeChart, layout, liveOptions)
  const svg = parse(content)

  it('is a standalone SVG document', () => {
    expect(content.startsWith('<?xml')).toBe(true)
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('font-family')).toContain('sans-serif')
  })

  it('is sized to the layout bounds with a margin', () => {
    const {xMin, xMax, yMin, yMax} = layout.bounds
    const width = xMax - xMin + 40
    const height = yMax - yMin + 40
    expect(Number(svg.getAttribute('width'))).toBe(width)
    expect(Number(svg.getAttribute('height'))).toBe(height)
    expect(svg.getAttribute('viewBox')).toBe(
      [xMin - 20, yMin - 20, width, height].join(' ')
    )
    expect(svg.querySelector('#chart-content').hasAttribute('transform')).toBe(
      false
    )
  })

  it('has a white background', () => {
    expect(svg.firstElementChild.getAttribute('fill')).toBe(
      exportPalette.background
    )
  })

  it('draws every person with concrete colours', () => {
    expect(svg.querySelectorAll('.person-node')).toHaveLength(3)
    expect(content).toContain('GivenR')
    expect(content).not.toContain('var(')
  })

  it('leaves out images, so no access token is written', () => {
    expect(svg.querySelectorAll('image')).toHaveLength(0)
    expect(content).not.toContain('jwt')
  })

  it('leaves out shadows and interactive elements', () => {
    expect(content).not.toContain('drop-shadow')
    expect(content).not.toContain('cursor')
    expect(svg.querySelectorAll('.add-person-btn')).toHaveLength(0)
    expect(svg.querySelectorAll('.children-triangle')).toHaveLength(0)
  })

  it('draws relationship charts', async () => {
    const relationships = await layoutRelationships(graph, 'R')
    const relationshipContent = chartSvgDocument(
      RelationshipChart,
      relationships,
      liveOptions
    )
    const relationshipSvg = parse(relationshipContent)
    expect(relationshipSvg.querySelectorAll('.node.person')).toHaveLength(3)
    expect(relationshipSvg.querySelectorAll('circle.married')).toHaveLength(1)
    expect(relationshipContent).not.toContain('var(')
    expect(relationshipContent).not.toContain('jwt')
  })
})
