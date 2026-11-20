import {describe, it, expect} from 'vitest'
import {select} from 'd3-selection'
import {
  ChromosomeBrowser,
  chromosomeBrowserSvgDocument,
  chromosomeKey,
  matchColor,
  matchStroke,
  segmentLanes,
} from '../../src/charts/ChromosomeBrowser.js'
import {
  GrampsjsChromosomeBrowser,
  matchGroups,
} from '../../src/components/GrampsjsChromosomeBrowser.js'
const segment = (chromosome, start, stop, side = 'P') => ({
  chromosome,
  start,
  stop,
  side,
  cM: 10,
  SNPs: 1000,
})

describe('chromosomeKey', () => {
  it('normalizes chromosome labels', () => {
    expect(chromosomeKey('7')).toBe('7')
    expect(chromosomeKey(' chr12 ')).toBe('12')
    expect(chromosomeKey('x')).toBe('X')
    expect(chromosomeKey('23')).toBe('X')
    expect(chromosomeKey(3)).toBe('3')
  })

  it('returns null for chromosomes the chart does not show', () => {
    expect(chromosomeKey('Y')).toBeNull()
    expect(chromosomeKey('MT')).toBeNull()
    expect(chromosomeKey('')).toBeNull()
    expect(chromosomeKey(undefined)).toBeNull()
  })
})

describe('matchColor', () => {
  const slots = [...Array(16).keys()]

  it('gives 16 matches distinct colours, then repeats', () => {
    const styles = slots.map(i => `${matchColor(i)} ${matchStroke(i)}`)
    expect(new Set(styles).size).toBe(16)
    expect(matchColor(16)).toBe(matchColor(0))
    expect(matchStroke(17)).toBe(matchStroke(1))
  })

  it('outlines the tints of the second eight in the hue of the first', () => {
    expect(slots.slice(0, 8).map(matchStroke)).toEqual(Array(8).fill(null))
    expect(slots.slice(8).map(matchStroke)).toEqual(
      slots.slice(0, 8).map(matchColor)
    )
  })
})

describe('segmentLanes', () => {
  const seg = (start, stop, side = 'P') => ({start, stop, side})

  it('puts overlapping segments of a side in separate lanes', () => {
    const {lanes, count} = segmentLanes([
      seg(10, 50),
      seg(40, 80),
      seg(60, 90),
      seg(20, 30, 'M'),
    ])
    expect(lanes).toEqual([0, 1, 0, 0])
    expect(count).toEqual({P: 2, U: 0, M: 1})
  })

  it('lets touching segments share a lane and handles reversed ranges', () => {
    const {lanes} = segmentLanes([seg(50, 10), seg(50, 90)])
    expect(lanes).toEqual([0, 0])
  })

  it('gives unphased segments a track of their own', () => {
    const {lanes, count} = segmentLanes([
      seg(10, 50, 'M'),
      seg(20, 30, 'U'),
      seg(5, 15),
      seg(25, 40, 'U'),
      seg(1, 60, null),
    ])
    expect(lanes).toEqual([0, 1, 0, 2, 0])
    expect(count).toEqual({P: 1, U: 3, M: 1})
  })

  it('has one lane per side and no unphased track without segments', () => {
    expect(segmentLanes([])).toEqual({lanes: [], count: {P: 1, U: 0, M: 1}})
  })
})

describe('ChromosomeBrowser', () => {
  const data = [
    {handle: 'a', segments: [segment('1', 100, 2000000)]},
    {
      handle: 'b',
      segments: [
        segment('chr2', 100, 2000000, 'M'),
        segment('Y', 100, 2000000),
        segment('23', 5000, 1000, 'U'),
      ],
    },
  ]

  it('binds each drawn segment to its match index and chromosome', () => {
    const svg = ChromosomeBrowser(data, {width: 500})
    const rects = select(svg).selectAll('rect.segment')
    const bound = rects.data().map(d => [d.index, d.chromosome, d.handle])
    expect(bound).toEqual([
      [0, '1', 'a'],
      [1, '2', 'b'],
      [1, 'X', 'b'],
    ])
  })

  it('draws paternal, unphased and maternal segments from top to bottom', () => {
    const svg = ChromosomeBrowser(
      [
        {
          handle: 'a',
          segments: [
            segment('1', 1, 2000000, 'M'),
            segment('1', 1, 2000000, 'U'),
            segment('1', 1, 2000000, 'P'),
          ],
        },
      ],
      {width: 500}
    )
    const ys = select(svg)
      .selectAll('rect.segment')
      .nodes()
      .map(node => Number(node.getAttribute('y')))
    expect(ys[2]).toBeLessThan(ys[1])
    expect(ys[1]).toBeLessThan(ys[0])
    const tracks = select(svg).selectAll('path.chromosome').data()
    // three tracks on chromosome 1, two on each of the other 22
    expect(tracks.length).toBe(3 + 22 * 2)
    // only the outer corners of a chromosome are rounded
    expect(
      tracks.slice(0, 3).map(d => [d.track, d.topRadius, d.bottomRadius])
    ).toEqual([
      ['P', 4, 0],
      ['U', 0, 0],
      ['M', 0, 4],
    ])
  })

  it('stacks overlapping segments and grows their chromosome', () => {
    const rowHeight = svg =>
      select(svg)
        .selectAll('path.chromosome')
        .data()
        .slice(0, 2)
        .reduce((sum, d) => sum + d.height, 0)
    const single = ChromosomeBrowser([data[0]], {width: 500})
    const overlapping = ChromosomeBrowser(
      [data[0], {handle: 'c', segments: [segment('1', 1000, 3000000)]}],
      {width: 500}
    )
    const ys = select(overlapping)
      .selectAll('rect.segment')
      .nodes()
      .map(node => Number(node.getAttribute('y')))
    expect(ys[0]).not.toBe(ys[1])
    const heights = select(overlapping)
      .selectAll('rect.segment')
      .nodes()
      .map(node => Number(node.getAttribute('height')))
    expect(heights[0]).toBeLessThan(
      Number(select(single).select('rect.segment').attr('height'))
    )
    expect(rowHeight(overlapping)).toBeGreaterThan(rowHeight(single))
    expect(Number(overlapping.getAttribute('height'))).toBeGreaterThan(
      Number(single.getAttribute('height'))
    )
  })

  it('places every segment on a chromosome row', () => {
    const svg = ChromosomeBrowser(data, {width: 500})
    select(svg)
      .selectAll('rect.segment')
      .each(function check() {
        const transform = this.parentNode.getAttribute('transform')
        expect(transform).toMatch(/^translate\(0, [\d.]+\)$/)
        expect(Number(this.getAttribute('width'))).toBeGreaterThan(0)
      })
  })

  it('colors segments by match index', () => {
    const svg = ChromosomeBrowser(data, {width: 500})
    const fills = select(svg)
      .selectAll('rect.segment')
      .nodes()
      .map(node => node.getAttribute('fill'))
    expect(fills).toEqual([matchColor(0), matchColor(1), 'url(#pattern-1)'])
  })

  it('colors segments by group when the matches have one', () => {
    const grouped = [
      {...data[0], group: 1},
      {...data[1], group: 0},
    ]
    const svg = ChromosomeBrowser(grouped, {width: 500})
    const rects = select(svg).selectAll('rect.segment')
    expect(rects.data().map(d => [d.index, d.group])).toEqual([
      [0, 1],
      [1, 0],
      [1, 0],
    ])
    expect(rects.nodes().map(node => node.getAttribute('fill'))).toEqual([
      matchColor(1),
      matchColor(0),
      'url(#pattern-0)',
    ])
  })
})

describe('matchGroups', () => {
  const data = [
    {handle: 'm0', ancestor_handles: [], distance: null},
    {handle: 'm1', ancestor_handles: ['j', 'm'], distance: 6},
    {handle: 'm2', ancestor_handles: ['p', 'a'], distance: 4},
    {handle: 'm3', ancestor_handles: ['m', 'j', 'j'], distance: 7},
    {handle: 'm4'},
    {handle: 'm5', ancestor_handles: ['j'], distance: 6},
  ]

  it('makes each match its own group by default', () => {
    const {groups, groupOf} = matchGroups(data, 'match')
    expect(groups.map(g => g.members)).toEqual([[0], [1], [2], [3], [4], [5]])
    expect(groupOf).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('groups matches by their set of common ancestors, closest first', () => {
    const {groups, groupOf} = matchGroups(data, 'ancestor')
    expect(groups).toEqual([
      {key: 'a p', members: [2]},
      {key: 'j m', members: [1, 3]},
      {key: 'j', members: [5]},
      {key: '', members: [0, 4]},
    ])
    expect(groupOf).toEqual([3, 1, 0, 1, 3, 2])
  })

  it('handles no matches', () => {
    expect(matchGroups([], 'ancestor')).toEqual({groups: [], groupOf: []})
  })
})

describe('GrampsjsChromosomeBrowser', () => {
  const match = {
    handle: 'm1',
    relation: 'Second cousin <i>once</i>',
    ancestor_profiles: [
      {name_given: '<img src=x onerror=alert(1)>', name_surname: 'Doe'},
      {name_given: '', name_surname: ''},
    ],
    segments: [segment('chr7', 1234567, 7654321, 'M')],
  }
  const person = {
    extended: {
      people: [
        {
          handle: 'm1',
          gramps_id: 'I0002',
          primary_name: {first_name: 'Ann <b>'},
        },
      ],
    },
    gramps_id: 'I0001',
  }

  const createElement = async () => {
    const element = new GrampsjsChromosomeBrowser()
    element.appState = {i18n: {strings: {}, lang: 'de'}}
    element.person = person
    element.data = [match]
    document.body.append(element)
    await element.updateComplete
    return element
  }

  it('renders tooltip text from match data without parsing it as HTML', async () => {
    const element = await createElement()
    const svg = element.renderRoot.querySelector('svg')
    const datum = select(svg).select('rect.segment').datum()
    const tooltip = element._renderTooltip(datum)
    expect(tooltip.querySelector('img, i')).toBeNull()
    const text = tooltip.textContent.replace(/\s+/g, ' ')
    expect(text).toContain('<img src=x onerror=alert(1)> Doe')
    expect(text).not.toContain('Doe, ')
    expect(text).toContain('Second cousin <i>once</i>')
    expect(text).toContain('Chromosome 7: 1.234.567–7.654.321')
    expect(text).toContain('10 cM, 1.000 SNPs')
    element.remove()
  })

  it('keeps one chart node across unrelated updates', async () => {
    const element = await createElement()
    const svg = element.renderRoot.querySelector('svg')
    element.loading = true
    await element.updateComplete
    expect(element.renderRoot.querySelector('svg')).toBe(svg)
    element.remove()
  })

  it('clears the legend selection when the matches change', async () => {
    const element = await createElement()
    element.selected = 0
    await element.updateComplete
    element.data = [{...match, handle: 'm2'}]
    await element.updateComplete
    expect(element.selected).toBe(-1)
    element.remove()
  })

  it('dims matches without segments on the chart in the legend', async () => {
    const element = await createElement()
    element.data = [
      match,
      {...match, handle: 'm2', segments: []},
      {...match, handle: 'm3', segments: [segment('Y', 1, 2)]},
    ]
    await element.updateComplete
    const empty = [...element.renderRoot.querySelectorAll('#legend li')].map(
      li => li.classList.contains('empty')
    )
    expect(empty).toEqual([false, true, true])
    element.remove()
  })

  it('shows the total cM of each match in the legend', async () => {
    const element = await createElement()
    element.data = [
      {...match, segments: [segment('1', 1, 2), segment('2', 1, 2)]},
    ]
    await element.updateComplete
    const total = element.renderRoot.querySelector('#legend-item-0 .total')
    expect(total.textContent.replace(/\s+/g, ' ').trim()).toBe('20 cM')
    element.remove()
  })

  it('dims the other matches while one is hovered', async () => {
    const element = await createElement()
    element.data = [match, {...match, handle: 'm2'}]
    await element.updateComplete
    element.renderRoot
      .querySelector('#legend-item-1')
      .dispatchEvent(new Event('mouseenter'))
    await element.updateComplete
    const dimmed = [...element.renderRoot.querySelectorAll('rect.segment')].map(
      rect => rect.classList.contains('dimmed')
    )
    expect(dimmed).toEqual([true, false])
    expect(
      element.renderRoot
        .querySelector('#legend-item-1')
        .classList.contains('hovered')
    ).toBe(true)
    element.remove()
  })

  describe('labelled by common ancestors', () => {
    const people = ['Ann', 'Bob', 'Cy'].map((name, i) => ({
      handle: `m${i + 1}`,
      gramps_id: `I000${i + 2}`,
      primary_name: {first_name: name, surname_list: []},
    }))
    const couple = [
      {handle: 'j', name_given: 'John', name_surname: 'Doe'},
      {handle: 'm', name_given: 'Mary', name_surname: 'Roe'},
    ]
    const data = [
      {
        handle: 'm1',
        ancestor_handles: ['j', 'm'],
        ancestor_profiles: couple,
        distance: 4,
        segments: [segment('1', 1, 2000000)],
      },
      {handle: 'm2', segments: [segment('2', 1, 2000000)]},
      {
        handle: 'm3',
        ancestor_handles: ['m', 'j'],
        ancestor_profiles: [couple[1], couple[0]],
        distance: 5,
        segments: [segment('3', 1, 2000000)],
      },
    ]

    const createGrouped = async () => {
      const element = await createElement()
      element.person = {...person, extended: {people}}
      element.data = data
      element.labelBy = 'ancestor'
      await element.updateComplete
      return element
    }

    const legendText = element =>
      [...element.renderRoot.querySelectorAll('#legend li')].map(li =>
        li.textContent.replace(/\s+/g, ' ').trim()
      )

    it('lists each set of common ancestors with its matches', async () => {
      const element = await createGrouped()
      expect(legendText(element)).toEqual([
        'John Doe, Mary RoeAnn, Cy',
        'UnknownBob',
      ])
      element.remove()
    })

    it('colors and dims the matches of a group together', async () => {
      const element = await createGrouped()
      const rects = () => [
        ...element.renderRoot.querySelectorAll('rect.segment'),
      ]
      expect(rects().map(rect => rect.getAttribute('fill'))).toEqual([
        matchColor(0),
        matchColor(1),
        matchColor(0),
      ])
      element.renderRoot
        .querySelector('#legend-item-0')
        .dispatchEvent(new Event('mouseenter'))
      await element.updateComplete
      expect(rects().map(rect => rect.classList.contains('dimmed'))).toEqual([
        false,
        true,
        false,
      ])
      element.remove()
    })

    it('shows only the selected group', async () => {
      const element = await createGrouped()
      element.renderRoot.querySelector('#legend-item-0').click()
      await element.updateComplete
      const handles = select(element.renderRoot.querySelector('svg'))
        .selectAll('rect.segment')
        .data()
        .map(d => d.handle)
      expect(handles).toEqual(['m1', 'm3'])
      element.remove()
    })

    it('clears the selection when switching back to matches', async () => {
      const element = await createGrouped()
      element.selected = 1
      await element.updateComplete
      element.labelBy = 'match'
      await element.updateComplete
      expect(element.selected).toBe(-1)
      expect(legendText(element)).toEqual(['Ann10 cM', 'Bob10 cM', 'Cy10 cM'])
      element.remove()
    })

    it('exports the group legend', async () => {
      const element = await createGrouped()
      const svg = new DOMParser().parseFromString(
        element.svgDocument(),
        'image/svg+xml'
      ).documentElement
      const texts = [...svg.lastElementChild.querySelectorAll('text')].map(
        text => text.textContent
      )
      expect(texts).toEqual(['John Doe, Mary RoeAnn, Cy', 'UnknownBob'])
      element.remove()
    })
  })

  it('opens the match when a segment is clicked', async () => {
    const element = await createElement()
    const paths = []
    element.addEventListener('nav', e => paths.push(e.detail.path))
    element.renderRoot
      .querySelector('rect.segment')
      .dispatchEvent(new MouseEvent('click', {bubbles: true}))
    expect(paths).toEqual(['dna-matches/I0001/I0002'])
    element.remove()
  })
})

describe('chromosomeBrowserSvgDocument', () => {
  const data = [
    {handle: 'a', segments: [segment('1', 100, 2000000)]},
    {handle: 'b', segments: [segment('2', 100, 2000000)]},
  ]

  const parse = content =>
    new DOMParser().parseFromString(content, 'image/svg+xml').documentElement

  it('is a standalone SVG with a background and fixed colours', () => {
    const svg = parse(
      chromosomeBrowserSvgDocument(data, [{index: 0, label: 'Ann'}])
    )
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('style')).toBeNull()
    expect(svg.firstElementChild.getAttribute('fill')).toBe('#ffffff')
    expect(svg.outerHTML).not.toContain('var(--')
  })

  it('falls back to sans-serif wherever a font is set', () => {
    const svg = parse(chromosomeBrowserSvgDocument(data, []))
    const families = [...svg.querySelectorAll('[font-family]')]
      .concat(svg)
      .map(el => el.getAttribute('font-family'))
    expect(families.every(family => family.endsWith('sans-serif'))).toBe(true)
  })

  it('adds the legend to the right of the chart', () => {
    const plain = parse(chromosomeBrowserSvgDocument(data, []))
    const svg = parse(
      chromosomeBrowserSvgDocument(data, [
        {index: 1, label: 'Bob', detail: '12.5 cM'},
      ])
    )
    const plainWidth = Number(plain.getAttribute('width'))
    expect(Number(svg.getAttribute('width'))).toBeGreaterThan(plainWidth)
    expect(svg.getAttribute('height')).toBe(plain.getAttribute('height'))
    const legend = svg.lastElementChild
    const [x] = legend
      .getAttribute('transform')
      .match(/[\d.]+/g)
      .map(Number)
    expect(x).toBeGreaterThan(plainWidth)
    const text = legend.querySelector('text')
    expect(text.textContent).toBe('Bob12.5 cM')
    expect(text.previousElementSibling.getAttribute('fill')).toBe(matchColor(1))
  })
})
