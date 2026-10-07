import {beforeAll, describe, it, expect, vi} from 'vitest'
import {TreeChart} from '../../src/charts/TreeChart.js'
import {RelationshipChart} from '../../src/charts/RelationshipChart.js'
import {FanChart} from '../../src/charts/FanChart.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'
import {layoutAncestors} from '../../src/charts/layout/treeLayout.js'
import {layoutRelationships} from '../../src/charts/layout/relationshipLayout.js'
import {layoutFan} from '../../src/charts/layout/fanLayout.js'
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
  getImageUrl: node => `https://example.com/${node.handle}?jwt=secret`,
  childrenTriangle: true,
  canEdit: true,
  duration: 400,
  bboxWidth: 800,
  bboxHeight: 600,
}

const parse = content =>
  new DOMParser().parseFromString(content, 'image/svg+xml').documentElement

// Returns a data URI for each URL, except for the image of M, which fails
const fetchImage = async url => {
  if (url.includes('/M?')) {
    throw new Error('Not found')
  }
  return `data:image/jpeg;base64,${btoa(url.split('?')[0])}`
}

// Browsers write `xlink:href` and happy-dom writes `href`
const imageHrefs = svg =>
  [...svg.querySelectorAll('image')].map(
    image => image.getAttribute('href') ?? image.getAttribute('xlink:href')
  )

describe('chartSvgDocument', () => {
  const layout = layoutAncestors(graph, 'R', {depth: 2})
  let content
  let svg

  beforeAll(async () => {
    content = await chartSvgDocument(TreeChart, layout, liveOptions, {
      fetchImage,
    })
    svg = parse(content)
  })

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

  it('embeds images as data URIs, so no access token is written', () => {
    expect(imageHrefs(svg)).toEqual(
      expect.arrayContaining([
        `data:image/jpeg;base64,${btoa('https://example.com/R')}`,
        `data:image/jpeg;base64,${btoa('https://example.com/F')}`,
      ])
    )
    expect(content).not.toContain('jwt')
    expect(content).not.toContain('https://example.com')
  })

  it('draws a card without an image when its image cannot be fetched', () => {
    expect(imageHrefs(svg)).toHaveLength(2)
    const cardOfM = [...svg.querySelectorAll('.person-node')].find(node =>
      node.textContent.includes('SurM')
    )
    expect(cardOfM.querySelector('image')).toBeNull()
  })

  it('fetches each image once', async () => {
    const fetchOnce = vi.fn(fetchImage)
    await chartSvgDocument(
      TreeChart,
      layout,
      {...liveOptions, getImageUrl: () => 'https://example.com/R?jwt=secret'},
      {fetchImage: fetchOnce}
    )
    expect(fetchOnce).toHaveBeenCalledTimes(1)
  })

  it('embeds images when the access token changes during the fetches', async () => {
    let token = 0
    const changingToken = parse(
      await chartSvgDocument(
        TreeChart,
        layout,
        {
          ...liveOptions,
          getImageUrl: node => {
            token += 1
            return `https://example.com/${node.handle}?jwt=${token}`
          },
        },
        {fetchImage}
      )
    )
    expect(imageHrefs(changingToken)).toHaveLength(2)
  })

  it('draws cards without images when the chart has none', async () => {
    const fetchNone = vi.fn(fetchImage)
    const noImages = parse(
      await chartSvgDocument(
        TreeChart,
        layout,
        {...liveOptions, getImageUrl: () => ''},
        {fetchImage: fetchNone}
      )
    )
    expect(noImages.querySelectorAll('image')).toHaveLength(0)
    expect(fetchNone).not.toHaveBeenCalled()
  })

  it('leaves out shadows and interactive elements', () => {
    expect(content).not.toContain('drop-shadow')
    expect(content).not.toContain('cursor')
    expect(svg.querySelectorAll('.add-person-btn')).toHaveLength(0)
    expect(svg.querySelectorAll('.children-triangle')).toHaveLength(0)
  })

  it('draws relationship charts', async () => {
    const relationships = await layoutRelationships(graph, 'R')
    const relationshipContent = await chartSvgDocument(
      RelationshipChart,
      relationships,
      liveOptions,
      {fetchImage}
    )
    const relationshipSvg = parse(relationshipContent)
    expect(relationshipSvg.querySelectorAll('.node.person')).toHaveLength(3)
    expect(relationshipSvg.querySelectorAll('circle.married')).toHaveLength(1)
    expect(imageHrefs(relationshipSvg)).toHaveLength(2)
    expect(relationshipContent).not.toContain('var(')
    expect(relationshipContent).not.toContain('jwt')
  })
})

describe('chartSvgDocument of a fan chart', () => {
  const layout = layoutFan(graph, 'R', {depth: 3})
  let content
  let svg

  beforeAll(async () => {
    // The fan chart has no images
    content = await chartSvgDocument(
      FanChart,
      layout,
      {...liveOptions, getImageUrl: undefined, color: 'nEvents'},
      {fetchImage}
    )
    svg = parse(content)
  })

  it('draws every known person with concrete colours', () => {
    expect(svg.querySelectorAll('.fan-cell')).toHaveLength(3)
    expect(content).toContain('GivenR')
    expect(content).not.toContain('var(')
    expect(content).not.toContain('cursor')
  })

  it('is sized to the layout bounds without the legend', () => {
    const {xMin, xMax, yMin, yMax} = layout.bounds
    expect(svg.getAttribute('viewBox')).toBe(
      [xMin - 20, yMin - 20, xMax - xMin + 40, yMax - yMin + 40].join(' ')
    )
    expect(svg.querySelector('#legend')).toBeNull()
  })
})
