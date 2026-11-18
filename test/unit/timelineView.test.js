import {describe, it, expect, vi} from 'vitest'

import {GrampsjsViewTimeline} from '../../src/views/GrampsjsViewTimeline.js'

const EVENTS = [
  {handle: 'E1', date: {sortval: 2400000}},
  {handle: 'E2', date: {sortval: 2410000}},
  {handle: 'E3', date: {sortval: 2420000}},
]

const PERSON = {
  handle: 'I1',
  gramps_id: 'I0001',
  event_ref_list: [{ref: 'E1'}],
}

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

// A timeline view that is never attached to the document.
function makeView() {
  const view = new GrampsjsViewTimeline()
  view.appState = {
    i18n: {lang: 'en', strings: {}},
    apiGet: vi.fn(),
  }
  view._data = EVENTS
  view._timelineEl = () => null
  return view
}

function selectPerson(view) {
  view._handleFilterChanged({
    detail: {objects: [{object_type: 'person', object: PERSON}]},
  })
}

const handles = view => view._filteredData.map(e => e.handle)

describe('timeline view: person filter', () => {
  it('adds family events once they have loaded', async () => {
    const view = makeView()
    const request = deferred()
    view.appState.apiGet.mockReturnValue(request.promise)
    selectPerson(view)
    expect(view.appState.apiGet).toHaveBeenCalledWith(
      '/api/people/I1?keys=handle,event_ref_list,extended&extend=family_list'
    )
    expect(handles(view)).toEqual(['E1'])

    request.resolve({
      data: {
        ...PERSON,
        extended: {families: [{event_ref_list: [{ref: 'E2'}]}]},
      },
    })
    await vi.waitFor(() => expect(handles(view)).toEqual(['E1', 'E2']))
  })

  it('keeps the own events when the person fails to load', async () => {
    const view = makeView()
    view.appState.apiGet.mockResolvedValue({error: 'Server error'})
    const errors = []
    view.addEventListener('grampsjs:error', e => errors.push(e))
    selectPerson(view)
    await vi.waitFor(() => expect(errors).toHaveLength(1))
    expect(handles(view)).toEqual(['E1'])
  })

  it('adds family events of ancestors', async () => {
    const view = makeView()
    view.appState.apiGet.mockResolvedValue({data: {...PERSON, extended: {}}})
    selectPerson(view)
    view.appState.apiGet.mockResolvedValue({
      data: [
        {handle: 'I2', event_ref_list: [{ref: 'E3'}], extended: {}},
        {
          handle: 'I3',
          event_ref_list: [],
          extended: {families: [{event_ref_list: [{ref: 'E2'}]}]},
        },
      ],
    })
    view._handleFilterModeChange({detail: {value: 'ancestors'}})
    expect(handles(view)).toEqual([])
    const [url] = view.appState.apiGet.mock.lastCall
    expect(url).toContain('IsLessThanNthGenerationAncestorOf')
    expect(url).toContain('&keys=handle,event_ref_list,extended')
    expect(url).toContain('&extend=family_list')
    await vi.waitFor(() => expect(handles(view)).toEqual(['E2', 'E3']))
  })

  it('ignores a response for an earlier mode', async () => {
    const view = makeView()
    const selfRequest = deferred()
    view.appState.apiGet.mockReturnValue(selfRequest.promise)
    selectPerson(view)
    view.appState.apiGet.mockResolvedValue({
      data: [{handle: 'I2', event_ref_list: [{ref: 'E3'}], extended: {}}],
    })
    view._handleFilterModeChange({detail: {value: 'descendants'}})
    await vi.waitFor(() => expect(handles(view)).toEqual(['E3']))
    selfRequest.resolve({
      data: {
        ...PERSON,
        extended: {families: [{event_ref_list: [{ref: 'E2'}]}]},
      },
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(handles(view)).toEqual(['E3'])
  })
})
