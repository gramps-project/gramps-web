import {describe, it, expect} from 'vitest'
import {select} from 'd3-selection'
import {schemeSet1} from 'd3-scale-chromatic'
import {
  ChromosomeBrowser,
  chromosomeKey,
  matchColor,
} from '../../src/charts/ChromosomeBrowser.js'
import {GrampsjsChromosomeBrowser} from '../../src/components/GrampsjsChromosomeBrowser.js'

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
  it('cycles through the palette', () => {
    expect(matchColor(0)).toBe(schemeSet1[0])
    expect(matchColor(schemeSet1.length)).toBe(schemeSet1[0])
    expect(matchColor(schemeSet1.length + 2)).toBe(schemeSet1[2])
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
    expect(rects.size()).toBe(3)
    const bound = rects.data().map(d => [d.index, d.chromosome, d.handle])
    expect(bound).toEqual([
      [0, '1', 'a'],
      [1, '2', 'b'],
      [1, 'X', 'b'],
    ])
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
