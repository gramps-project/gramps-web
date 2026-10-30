import {describe, it, expect, vi, afterEach} from 'vitest'
import {GrampsjsViewObjectsBase} from '../../src/views/GrampsjsViewObjectsBase.js'

const handlesOf = count => Array.from({length: count}, (_, i) => `h${i}`)

function makeView(response, {selected = ['h1', 'h2']} = {}) {
  const view = Object.create(GrampsjsViewObjectsBase.prototype)
  const prog = {
    reset: vi.fn(),
    setComplete: vi.fn(),
    setError: vi.fn(),
  }
  const filters = {filters: [], query: ''}
  Object.defineProperty(view, 'renderRoot', {
    value: {
      querySelector: selector =>
        selector === 'grampsjs-filters' ? filters : prog,
    },
  })
  view.appState = {
    apiPost: vi.fn().mockResolvedValue(response),
    apiGet: vi.fn().mockResolvedValue(response),
    i18n: {strings: {}},
  }
  view._objectsName = 'people'
  view._selectedHandles = selected
  view._selectionKey = 0
  view._selectionMode = true
  view._allMatchingRows = null
  view._selectAllRequest = null
  view.dispatchEvent = vi.fn()
  return {view, prog, filters}
}

describe('deleting the selected objects', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes a few objects right away and refreshes', async () => {
    const {view, prog} = makeView({data: []})
    const dbChanged = vi.fn()
    window.addEventListener('db:changed', dbChanged)
    await view._handleDelete()
    window.removeEventListener('db:changed', dbChanged)

    expect(view.appState.apiPost).toHaveBeenCalledWith(
      '/api/objects/delete-by-handle/',
      {namespace: 'people', handles: ['h1', 'h2']},
      {dbChanged: false}
    )
    expect(prog.setComplete).toHaveBeenCalled()
    expect(dbChanged).toHaveBeenCalledTimes(1)
    expect(view._selectedHandles).toEqual([])
    expect(view._deleting).toBe(false)
  })

  it('asks for a background deletion of more objects', async () => {
    // an API without background deletion answers right away
    const {view} = makeView({data: []}, {selected: handlesOf(11)})
    await view._handleDelete()

    expect(view.appState.apiPost.mock.calls[0][0]).toBe(
      '/api/objects/delete-by-handle/?background=1'
    )
  })

  it('reports an error and keeps the selection', async () => {
    const {view, prog} = makeView({error: 'Forbidden'})
    await view._handleDelete()

    expect(prog.setError).toHaveBeenCalled()
    const event = view.dispatchEvent.mock.calls[0][0]
    expect(event.type).toBe('grampsjs:error')
    expect(event.detail.message).toBe('Forbidden')
    expect(view._selectedHandles).toEqual(['h1', 'h2'])
    expect(view._deleting).toBe(false)
  })
})

describe('selecting all matching objects', () => {
  function pageView(response) {
    const {view, filters} = makeView(response)
    view._rawData = [{handle: 'h1'}, {handle: 'h2'}]
    view._totalCount = 3
    return {view, filters}
  }

  it('is offered once the whole page is selected', () => {
    const {view} = pageView({})
    expect(view._canSelectAllMatching).toBe(true)
    view._selectedHandles = ['h1']
    expect(view._canSelectAllMatching).toBe(false)
  })

  it('is not offered when the page shows all matching objects', () => {
    const {view} = pageView({})
    view._totalCount = 2
    expect(view._canSelectAllMatching).toBe(false)
  })

  it('selects the handles of all objects matching the filters', async () => {
    const rows = [{handle: 'h1'}, {handle: 'h2'}, {handle: 'h3'}]
    const {view, filters} = pageView({data: rows})
    filters.filters = [{name: 'HasTag', values: ['ToDo']}]
    await view._selectAllMatching()

    expect(view.appState.apiGet).toHaveBeenCalledWith(
      `/api/people/?keys=handle&rules=${encodeURIComponent(
        JSON.stringify({rules: filters.filters})
      )}`
    )
    expect(view._selectedHandles).toEqual(['h1', 'h2', 'h3'])
    expect(view._canSelectAllMatching).toBe(false)
  })

  it('drops the result when the filters changed meanwhile', async () => {
    const {view, filters} = pageView({data: [{handle: 'h9'}]})
    view.appState.apiGet = vi.fn(async () => {
      // changed filters reload the page, which clears the selection
      filters.query = 'gramps_id ~ I1'
      view._clearSelection()
      view._handleSelectionChanged({detail: {indices: [0, 1]}})
      return {data: [{handle: 'h9'}]}
    })
    await view._selectAllMatching()

    expect(view._selectedHandles).toEqual(['h1', 'h2'])
    expect(view._allMatchingRows).toBe(null)
  })

  it('drops the result when the page was selected anew meanwhile', async () => {
    const {view} = pageView({})
    view.appState.apiGet = vi.fn(async () => {
      view._toggleSelectionMode()
      view._toggleSelectionMode()
      view._handleSelectionChanged({detail: {indices: [0, 1]}})
      return {data: [{handle: 'h1'}, {handle: 'h2'}, {handle: 'h3'}]}
    })
    await view._selectAllMatching()

    expect(view._selectedHandles).toEqual(['h1', 'h2'])
    expect(view._allMatchingRows).toBe(null)
    expect(view._selectingAll).toBe(false)
  })

  it('stops waiting when selection mode is left', async () => {
    const {view} = pageView({})
    let respond
    view.appState.apiGet = vi.fn(
      () =>
        new Promise(resolve => {
          respond = resolve
        })
    )
    const pending = view._selectAllMatching()
    expect(view._selectingAll).toBe(true)
    view._toggleSelectionMode()
    expect(view._selectingAll).toBe(false)

    respond({data: [{handle: 'h1'}, {handle: 'h2'}, {handle: 'h3'}]})
    await pending
    expect(view._selectedHandles).toEqual([])
  })

  it('ends when the selection changes', async () => {
    const {view} = pageView({data: [{handle: 'h1'}]})
    await view._selectAllMatching()
    view._rawData = [{handle: 'h1'}, {handle: 'h2'}]
    view._handleSelectionChanged({detail: {indices: [0]}})

    expect(view._selectedHandles).toEqual(['h1'])
    expect(view._allMatchingRows).toBe(null)
  })
})
