import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest'
import {GrampsjsViewObjectsBase} from '../../src/views/GrampsjsViewObjectsBase.js'
import {clearTagCache} from '../../src/tags.js'

const URL = '/api/objects/edit-by-handle/'

function makeView(
  response,
  {selected = ['h1', 'h2'], deleteProg = {open: false}} = {}
) {
  const view = Object.create(GrampsjsViewObjectsBase.prototype)
  const prog = {
    reset: vi.fn(),
    setComplete: vi.fn(),
    setError: vi.fn(),
  }
  Object.defineProperty(view, 'renderRoot', {
    value: {
      querySelector: selector =>
        selector === '#progress-delete' ? deleteProg : prog,
    },
  })
  view.appState = {
    apiPost: vi.fn().mockResolvedValue(response),
    apiGet: vi.fn().mockResolvedValue(response),
    i18n: {strings: {}},
    dbInfo: {gramps_webapi: {version: '3.26.0'}},
  }
  view._objectsName = 'notes'
  view._selectedHandles = selected
  view._selectionKey = 0
  view._selectionMode = true
  view._allMatchingRows = null
  view._selectAllRequest = null
  view._editDialog = ''
  view._editHandles = []
  view.dispatchEvent = vi.fn()
  return {view, prog}
}

function saveEvent(data) {
  return {detail: {data}, preventDefault: vi.fn(), stopPropagation: vi.fn()}
}

describe('editing the selected objects', () => {
  beforeEach(() => {
    clearTagCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is offered from API version 3.26', () => {
    const {view} = makeView({})
    expect(view._supportsEdit).toBe(true)
    view.appState.dbInfo = {gramps_webapi: {version: '3.25.3'}}
    expect(view._supportsEdit).toBe(false)
  })

  it('asks to select objects first', async () => {
    const {view} = makeView({}, {selected: []})
    view._currentAction = 'privacy'
    await view._handleApplyAction()
    expect(view._showActionError).toBe(true)
    expect(view._editDialog).toBe('')
  })

  it('sets the privacy and refreshes', async () => {
    const {view, prog} = makeView({data: [{handle: 'h1'}]})
    view._currentAction = 'privacy'
    await view._handleApplyAction()
    expect(view._editDialog).toBe('privacy')
    view._editPrivate = true
    const dbChanged = vi.fn()
    window.addEventListener('db:changed', dbChanged)
    await view._handlePrivacyApply()
    window.removeEventListener('db:changed', dbChanged)

    expect(view.appState.apiPost).toHaveBeenCalledWith(
      URL,
      {
        namespace: 'notes',
        handles: ['h1', 'h2'],
        operations: [{op: 'set_private', value: true}],
      },
      {dbChanged: false}
    )
    expect(view._editDialog).toBe('')
    expect(prog.setComplete).toHaveBeenCalled()
    expect(dbChanged).toHaveBeenCalledTimes(1)
    expect(view._selectedHandles).toEqual([])
    expect(view._editing).toBe(false)
  })

  it('makes objects public', async () => {
    const {view} = makeView({data: []})
    await view._openEditDialog('privacy')
    view._editPrivate = false
    await view._handlePrivacyApply()
    expect(view.appState.apiPost.mock.calls[0][1].operations).toEqual([
      {op: 'set_private', value: false},
    ])
  })

  it('edits more objects in the background', async () => {
    const handles = Array.from({length: 11}, (_, i) => `h${i}`)
    const {view} = makeView({data: []}, {selected: handles})
    await view._editObjects(handles, [{op: 'set_private', value: true}])
    expect(view.appState.apiPost.mock.calls[0][0]).toBe(`${URL}?background=1`)
  })

  it('adds the tag to the objects selected when the dialog opened', async () => {
    const {view} = makeView({data: []})
    await view._openEditDialog('addTag')
    // creating a new tag reloads the list, which clears the selection
    view._clearSelection()
    await view._handleAddTagSave(saveEvent(['t1']))

    expect(view.appState.apiPost).toHaveBeenCalledWith(
      URL,
      {
        namespace: 'notes',
        handles: ['h1', 'h2'],
        operations: [{op: 'add_tag', handle: 't1'}],
      },
      {dbChanged: false}
    )
    expect(view._editDialog).toBe('')
  })

  it('removes the chosen tag', async () => {
    const tags = [{handle: 't1', name: 'ToDo'}]
    const {view} = makeView({data: tags})
    await view._openEditDialog('removeTag')
    expect(view._editTags).toEqual(tags)
    view._editTagHandle = 't1'
    await view._handleRemoveTagApply()

    expect(view.appState.apiPost.mock.calls[0][1].operations).toEqual([
      {op: 'remove_tag', handle: 't1'},
    ])
  })

  it('closes the remove dialog when the tags cannot be loaded', async () => {
    const {view} = makeView({error: 'Network'})
    await view._openEditDialog('removeTag')
    expect(view._editDialog).toBe('')
    const event = view.dispatchEvent.mock.calls[0][0]
    expect(event.type).toBe('grampsjs:error')
    expect(view.appState.apiPost).not.toHaveBeenCalled()
  })

  it('hides the outcome of a deletion in the shared place', async () => {
    const deleteProg = {open: true}
    const {view, prog} = makeView({data: []}, {deleteProg})
    await view._editObjects(['h1'], [{op: 'set_private', value: true}])
    expect(deleteProg.open).toBe(false)
    expect(prog.open).toBe(true)
  })

  it('reports an error and keeps the selection', async () => {
    const {view, prog} = makeView({error: 'Forbidden'})
    await view._editObjects(['h1', 'h2'], [{op: 'set_private', value: true}])

    expect(prog.setError).toHaveBeenCalled()
    const event = view.dispatchEvent.mock.calls[0][0]
    expect(event.type).toBe('grampsjs:error')
    expect(event.detail.message).toBe('Forbidden')
    expect(view._selectedHandles).toEqual(['h1', 'h2'])
    expect(view._editing).toBe(false)
  })
})
