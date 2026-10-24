import {describe, it, expect, vi} from 'vitest'
import {render} from 'lit'

import {GrampsjsYtreeLineage} from '../../src/components/GrampsjsYtreeLineage.js'
import {GrampsjsDnaMatchTable} from '../../src/components/GrampsjsDnaMatchTable.js'
import {GrampsjsViewDnaMatches} from '../../src/views/GrampsjsViewDnaMatches.js'

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
