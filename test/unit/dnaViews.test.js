import {describe, it, expect, vi} from 'vitest'
import {render} from 'lit'
import {zoomTransform} from 'd3-zoom'

import {fireEvent} from '../../src/util.js'

import {
  GrampsjsYtreeLineage,
  biologicalFatherHandle,
} from '../../src/components/GrampsjsYtreeLineage.js'
import {GrampsjsDnaMatchTable} from '../../src/components/GrampsjsDnaMatchTable.js'
import {GrampsjsViewDnaMatches} from '../../src/views/GrampsjsViewDnaMatches.js'
import {GrampsjsDnaMatches} from '../../src/components/GrampsjsDnaMatches.js'
import {GrampsjsFormNewMatch} from '../../src/components/GrampsjsFormNewMatch.js'
import {
  GrampsjsConnectionChart,
  fittedHeight,
} from '../../src/components/GrampsjsConnectionChart.js'
import {layoutRelationships} from '../../src/charts/layout/relationshipLayout.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const clade = (name, formed, mrca) => ({
  name,
  age_info: {formed, most_recent_common_ancestor: mrca},
})

const lineage = (data, person = {}) => {
  const element = new GrampsjsYtreeLineage()
  element.appState = {i18n: {strings: {}, lang: 'en'}}
  element.data = data
  element.person = person
  return element
}

describe('GrampsjsYtreeLineage', () => {
  it('formats clade years between 1 and 99 AD', () => {
    const [box] = lineage([clade('A', 1950), clade('B', 1900)]).getChartData()
    expect(box.year).toBe('≈ 50')
  })

  it('counts generations from the last clade to the birth year', () => {
    const person = {
      birth_ref_index: 0,
      extended: {events: [{date: {year: 1960}}]},
    }
    const boxes = lineage([clade('A', 1000), clade('B', 400)], person)
    const chart = boxes.getChartData()
    // B formed 400 years before 2000, i.e. 1600: 360 years to 1960
    expect(chart.at(-2).connectorText).toContain('18')
  })

  it('places the documented paternal line between clades and person', () => {
    const born = (handle, year) => ({
      handle,
      gramps_id: handle,
      primary_name: {first_name: handle},
      birth_ref_index: year ? 0 : -1,
      extended: {events: year ? [{date: {year}}] : []},
    })
    const element = lineage(
      [clade('A', 1000), clade('B', 400)],
      born('son', 1960)
    )
    // father without a birth year, grandfather born 1880
    element._ancestors = [born('father'), born('grandfather', 1880)]
    const chart = element.getChartData()
    expect(chart.map(box => box.name)).toEqual([
      'A',
      'B',
      'grandfather …',
      'father …',
      'son …',
    ])
    expect(chart.map(box => !!box.documented)).toEqual([
      false,
      false,
      true,
      true,
      false,
    ])
    // B formed in 1600: 280 years to 1880, 14 generations
    expect(chart[1].connectorText).toContain('14')
  })

  it('counts generations from the oldest dated person of the line', () => {
    const element = lineage([clade('A', 1000), clade('B', 400)], {
      handle: 'son',
      birth_ref_index: 0,
      extended: {events: [{date: {year: 1960}}]},
    })
    // two undated generations above the son
    element._ancestors = [{handle: 'father'}, {handle: 'grandfather'}]
    const chart = element.getChartData()
    // 18 generations from 1600 to 1960, two of them documented
    expect(chart[1].connectorText).toContain('16')
  })

  it('counts no generations from a clade without an age', () => {
    const element = lineage([clade('A', 1000), clade('B', '')], {
      birth_ref_index: 0,
      extended: {events: [{date: {year: 1960}}]},
    })
    expect(element.getChartData().at(-2).connectorText).toBe('')
  })

  it('follows only birth fathers up the paternal line', () => {
    const person = parentFamilies => ({
      handle: 'child',
      extended: {parent_families: parentFamilies},
    })
    const family = (father, frel) => ({
      father_handle: father,
      child_ref_list: [{ref: 'child', ...(frel && {frel})}],
    })
    expect(biologicalFatherHandle(person([family('dad')]))).toBe('dad')
    expect(
      biologicalFatherHandle(
        person([family('adoptive', 'Adopted'), family('dad', 'Birth')])
      )
    ).toBe('dad')
    expect(
      biologicalFatherHandle(person([family('step', 'Stepchild')]))
    ).toBeNull()
    expect(biologicalFatherHandle(person([family('')]))).toBeNull()
    expect(biologicalFatherHandle({handle: 'child'})).toBeNull()
  })

  it('loads the paternal line father first and stops at a cycle', async () => {
    const child = (handle, father) => ({
      handle,
      extended: {
        parent_families: [
          {father_handle: father, child_ref_list: [{ref: handle}]},
        ],
      },
    })
    // the grandfather is recorded as the father of the son
    const people = {
      son: child('son', 'father'),
      father: child('father', 'grandfather'),
      grandfather: child('grandfather', 'son'),
    }
    const element = lineage([], people.son)
    element.appState.apiGet = vi.fn(async url => ({
      data: people[url.match(/people\/(\w+)/)[1]],
    }))
    await element._fetchPaternalAncestors()
    expect(element._ancestors.map(person => person.handle)).toEqual([
      'father',
      'grandfather',
    ])
  })

  it('offers the expand button whenever clades are hidden', () => {
    const element = lineage([
      clade('A', 3000),
      clade('B', 2000),
      clade('C', 900),
    ])
    const root = document.createElement('div')
    render(element.render(), root)
    expect(root.querySelector('#expand-button')).not.toBeNull()
  })
})

describe('GrampsjsDnaMatchTable', () => {
  it('formats numbers for the app language', () => {
    const element = new GrampsjsDnaMatchTable()
    element.appState = {i18n: {strings: {}, lang: 'de'}}
    const root = document.createElement('div')
    const table = () => root.querySelector('grampsjs-table')
    element.segments = [
      {chromosome: '1', start: 1234567, stop: 2345678, side: 'P', cM: 12.345},
    ]
    render(element.render(), root)
    const [, start, , , length] = table().columns
    expect(start.format(1234567)).toBe('1.234.567')
    expect(length.format(12.345)).toBe('12,3')
  })

  it('keeps the columns of the same language', () => {
    const element = new GrampsjsDnaMatchTable()
    element.appState = {i18n: {strings: {}, lang: 'de'}}
    element.segments = [{chromosome: '1', start: 1, stop: 2, side: 'P'}]
    const root = document.createElement('div')
    render(element.render(), root)
    const {columns} = root.querySelector('grampsjs-table')
    render(element.render(), root)
    expect(root.querySelector('grampsjs-table').columns).toBe(columns)
  })

  it('leaves missing numbers empty', () => {
    const element = new GrampsjsDnaMatchTable()
    element.appState = {i18n: {strings: {}, lang: 'en'}}
    element.segments = [{chromosome: '1'}]
    const root = document.createElement('div')
    render(element.render(), root)
    const table = root.querySelector('grampsjs-table')
    const [, , , , length, snps] = table.columns
    expect(table._formatValue(length, undefined)).toBe('')
    expect(table._formatValue(snps, null)).toBe('')
  })

  it('renders the empty message without segments', () => {
    const element = new GrampsjsDnaMatchTable()
    element.appState = {i18n: {strings: {}}}
    element.segments = undefined
    const root = document.createElement('div')
    render(element.render(), root)
    expect(root.textContent).toContain('No DNA matches detected')
  })
})

describe('GrampsjsViewDnaMatches', () => {
  it('deletes only the DNA association with the match', async () => {
    const view = new GrampsjsViewDnaMatches()
    const person = {
      handle: 'p1',
      person_ref_list: [
        {ref: 'm1', rel: 'DNA'},
        {ref: 'm1', rel: 'Godfather'},
        {ref: 'm2', rel: 'DNA'},
      ],
    }
    const apiPut = vi.fn().mockResolvedValue({error: 'stop here'})
    view.appState = {
      i18n: {strings: {}},
      apiGet: vi.fn().mockResolvedValue({data: person}),
      apiPut,
    }
    view.active = true
    view.grampsId = 'I1'
    view.grampsIdMatch = 'I2'
    view._data = [
      {
        handle: 'p1',
        gramps_id: 'I1',
        extended: {people: [{handle: 'm1', gramps_id: 'I2'}]},
      },
    ]
    view.addEventListener('grampsjs:error', () => {})
    await view._deleteMatch()
    expect(apiPut.mock.calls[0][1].person_ref_list).toEqual([
      {ref: 'm1', rel: 'Godfather'},
      {ref: 'm2', rel: 'DNA'},
    ])
  })

  it('reloads DNA data only when another person is selected', () => {
    const view = new GrampsjsViewDnaMatches()
    view._data = [{handle: 'p1', gramps_id: 'I1'}]
    view.grampsId = 'I1'
    view._dnaData = {grampsId: 'I1', data: []}
    expect(view._shouldLoadDnaData()).toBe(false)
    view._dnaData = {grampsId: 'I0', data: []}
    expect(view._shouldLoadDnaData()).toBe(true)
  })
})

describe('GrampsjsDnaMatches', () => {
  it('formats shared cM for the app language', () => {
    const element = new GrampsjsDnaMatches()
    element.appState = {i18n: {strings: {}, lang: 'de'}}
    const [, , shared, segments] = element._columns
    expect(shared.format(1234.56)).toBe('1.234,6')
    expect(segments.format(1234)).toBe('1.234')
  })
})

describe('GrampsjsFormNewMatch', () => {
  it('treats the preselected first person as selected', () => {
    const form = new GrampsjsFormNewMatch()
    form.sourcePersonInitial = {handle: 'p1', gramps_id: 'I1'}
    form.willUpdate(new Map([['sourcePersonInitial', {}]]))
    expect(form.data.source_handle).toBe('p1')
  })
})

describe('GrampsjsConnectionChart', () => {
  const limits = {minHeight: 200, maxHeight: 600}
  // 400 x 300 with the fit margins of 20 on each side
  const bounds = {xMin: 0, xMax: 360, yMin: 0, yMax: 260}

  it('is as high as the fitted chart', () => {
    expect(fittedHeight(bounds, 800, limits)).toBe(300)
    // half as wide: zoomed out to half the size
    expect(fittedHeight({...bounds, xMax: 760}, 400, limits)).toBe(200)
  })

  it('stays between the minimum and maximum height', () => {
    expect(fittedHeight({...bounds, yMax: 60}, 800, limits)).toBe(200)
    expect(fittedHeight({...bounds, yMax: 2000}, 800, limits)).toBe(600)
  })

  it("opens the person's page on a card click", () => {
    const element = new GrampsjsConnectionChart()
    element.appState = {i18n: {strings: {}, lang: 'en'}}
    element.grampsId1 = 'I1'
    element.grampsId2 = 'I2'
    element._data = {data: [{handle: 'p1'}]}
    const root = document.createElement('div')
    document.body.append(root)
    render(element.renderContent(), root, {host: element})
    const card = document.createElement('div')
    root.querySelector('#container').append(card)
    const selected = vi.fn()
    const nav = vi.fn()
    window.addEventListener('pedigree:person-selected', selected)
    element.addEventListener('nav', nav)
    fireEvent(card, 'pedigree:person-selected', {grampsId: 'I1'})
    window.removeEventListener('pedigree:person-selected', selected)
    root.remove()
    expect(selected).not.toHaveBeenCalled()
    expect(nav.mock.calls[0][0].detail).toEqual({path: 'person/I1'})
  })

  describe('container height', () => {
    const family = {
      handle: 'f',
      type: 'Married',
      father_handle: 'F',
      mother_handle: 'M',
      child_ref_list: [{ref: 'R', frel: 'Birth', mrel: 'Birth'}],
    }
    const person = (handle, extended = {}) => ({
      handle,
      gramps_id: `I_${handle}`,
      profile: {gramps_id: `I_${handle}`, name_surname: handle},
      extended: {families: [], ...extended},
    })
    const graph = new FamilyGraph([
      person('R', {primary_parent_family: family, parent_families: [family]}),
      person('F', {families: [family]}),
      person('M', {families: [family]}),
    ])

    // A chart in a 300 pixel wide container, whose height is its style
    const chartElement = () => {
      const element = new GrampsjsConnectionChart()
      element.appState = {i18n: {strings: {}, lang: 'en'}}
      element.grampsId1 = 'I_R'
      element.grampsId2 = 'I_F'
      element.loading = false
      element.containerWidth = 300
      const host = document.createElement('div')
      const root = host.attachShadow({mode: 'open'})
      const container = document.createElement('div')
      container.id = 'container'
      Object.defineProperty(container, 'offsetHeight', {
        get: () => parseFloat(container.style.height),
      })
      root.append(container)
      Object.defineProperty(element, 'renderRoot', {value: root})
      return {element, container}
    }

    it('fits the height and zoom to the chart of each pair of people', async () => {
      const {element, container} = chartElement()
      element._layout = await layoutRelationships(graph, 'R')
      element.updated(new Map())
      const {k} = zoomTransform(element._chart.node)
      const height = container.style.height
      element._chart.viewport.zoomBy(0.5)
      element.grampsId2 = 'I_M'
      element._layout = await layoutRelationships(graph, 'R')
      element.updated(new Map())
      expect(container.style.height).toBe(height)
      expect(zoomTransform(element._chart.node).k).toBeCloseTo(k)
    })

    it('is as high as the chart, without a maximum', async () => {
      const {element, container} = chartElement()
      element._layout = await layoutRelationships(graph, 'R')
      element._layout.bounds = {...element._layout.bounds, yMax: 3000}
      element.updated(new Map())
      expect(parseFloat(container.style.height)).toBeGreaterThan(2000)
    })

    it('keeps the fitted height while loading again', async () => {
      const {element, container} = chartElement()
      element._layout = await layoutRelationships(graph, 'R')
      element.updated(new Map())
      const root = document.createElement('div')
      render(element.renderLoading(), root)
      expect(root.firstElementChild.style.height).toBe(container.style.height)
    })
  })

  it('leaves the wheel and touch to the page', () => {
    const element = new GrampsjsConnectionChart()
    const listeners = element._chart.node.__on ?? []
    expect(listeners.some(({name}) => name === 'zoom')).toBe(false)
  })

  it('renders no frame without people', () => {
    const element = new GrampsjsConnectionChart()
    element.appState = {i18n: {strings: {}, lang: 'en'}}
    element.grampsId1 = 'I1'
    element.grampsId2 = 'I2'
    element._data = {data: []}
    expect(element.renderContent()).toBe('')
  })
})
