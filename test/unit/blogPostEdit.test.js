import {describe, it, expect, vi, beforeEach} from 'vitest'
import {clearDraftsWithPrefix} from '../../src/api.js'
import {clearTagCache} from '../../src/tags.js'
import {GrampsjsViewBlogPost} from '../../src/views/GrampsjsViewBlogPost.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {...actual, clearDraftsWithPrefix: vi.fn()}
})

const text = string => ({_class: 'StyledText', string, tags: []})

const note = {
  _class: 'Note',
  handle: 'note-handle',
  gramps_id: 'N1',
  text: text('Hello'),
  private: false,
}

const makeSource = (props = {}) => ({
  _class: 'Source',
  handle: 'source-handle',
  gramps_id: 'S1',
  title: 'My post',
  private: false,
  tag_list: ['blog-tag'],
  note_list: ['note-handle'],
  media_list: [],
  attribute_list: [],
  extended: {notes: [note]},
  ...props,
})

const formData = (props = {}) => ({
  title: 'My post',
  author: '',
  date: '2025-01-02',
  text: text('Hello'),
  media_list: [],
  tag_list: ['blog-tag'],
  private: false,
  ...props,
})

// an active post page showing the source, with a stand-in for the form
const makeView = ({source = makeSource(), apiPut, apiPost} = {}) => {
  const view = new GrampsjsViewBlogPost()
  view.createRenderRoot()
  view.active = true
  view.grampsId = 'S1'
  view._dataSources = [source]
  const form = {data: formData()}
  Object.defineProperty(view, '_form', {get: () => form})
  view.appState = {
    permissions: {canEdit: true},
    i18n: {strings: {}, lang: 'en'},
    apiGet: vi.fn().mockResolvedValue({
      data: [{handle: 'blog-tag', name: 'Blog'}],
    }),
    apiPut: apiPut ?? vi.fn().mockResolvedValue({data: []}),
    apiPost: apiPost ?? vi.fn().mockResolvedValue({data: []}),
  }
  vi.spyOn(view, 'dispatchEvent')
  return view
}

const firedTypes = view => view.dispatchEvent.mock.calls.map(([e]) => e.type)

describe('blog post page: edit mode', () => {
  it('turns on edit mode with a save button', () => {
    const view = makeView()

    view._toggleEditMode()

    expect(view.edit).toBe(true)
    expect(view.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'edit-mode:on',
        detail: {title: 'Edit', saveButton: true},
      })
    )
  })

  it('asks to close edit mode when toggled while editing', () => {
    const view = makeView()
    view._toggleEditMode()

    view._toggleEditMode()

    expect(firedTypes(view)).toContain('edit-mode:close-request')
  })

  it('does not edit when inactive, without permission or without a post', () => {
    const inactive = makeView()
    inactive.active = false
    inactive._toggleEditMode()
    expect(inactive.edit).toBe(false)

    const readOnly = makeView()
    readOnly.appState.permissions.canEdit = false
    readOnly._toggleEditMode()
    expect(readOnly.edit).toBe(false)

    const empty = makeView()
    empty._dataSources = []
    empty._toggleEditMode()
    expect(empty.edit).toBe(false)
  })

  it('reloads the post after editing when it changed meanwhile', () => {
    const view = makeView()
    view._fetchData = vi.fn()
    view._toggleEditMode()

    view.handleUpdateStaleData()
    expect(view._fetchData).not.toHaveBeenCalled()

    view._disableEditMode()
    expect(view.edit).toBe(false)
    expect(view._fetchData).toHaveBeenCalledOnce()
  })

  it('does not reload after editing when nothing changed', () => {
    const view = makeView()
    view._fetchData = vi.fn()
    view._toggleEditMode()

    view._disableEditMode()

    expect(view._fetchData).not.toHaveBeenCalled()
  })
})

describe('blog post page: saving', () => {
  beforeEach(() => {
    clearDraftsWithPrefix.mockClear()
    clearTagCache()
  })

  it('saves the form and ends edit mode', async () => {
    const view = makeView()
    view._toggleEditMode()
    view._form.data = formData({title: 'New title'})

    await view._handleSave()

    expect(view.appState.apiPut).toHaveBeenCalledOnce()
    const [url, data] = view.appState.apiPut.mock.calls[0]
    expect(url).toBe('/api/sources/source-handle')
    expect(data).toMatchObject({
      title: 'New title',
      attribute_list: [
        {_class: 'SrcAttribute', type: 'Date', value: '2025-01-02'},
      ],
    })
    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('blog:S1:')
    expect(firedTypes(view)).toContain('edit-mode:off')
  })

  it('saves changed media privacy before the post', async () => {
    const view = makeView()
    view._toggleEditMode()
    view._form.data = formData({
      media_list: [{ref: 'media-a'}],
      media_updates: [{handle: 'media-a', private: true}],
    })

    await view._handleSave()

    expect(view.appState.apiPut.mock.calls.map(([url]) => url)).toEqual([
      '/api/media/media-a',
      '/api/sources/source-handle',
    ])
    expect(view.appState.apiPut.mock.calls[0][1]).toEqual({
      handle: 'media-a',
      private: true,
    })
  })

  it('keeps the Blog tag when it was removed in the form', async () => {
    const view = makeView()
    view._toggleEditMode()
    view._form.data = formData({tag_list: []})

    await view._handleSave()

    expect(view.appState.apiPut.mock.calls[0][1].tag_list).toEqual(['blog-tag'])
  })

  it('stays in edit mode and reports the error when saving fails', async () => {
    const view = makeView({
      apiPut: vi.fn().mockResolvedValue({error: 'Nope'}),
    })
    view._toggleEditMode()

    await view._handleSave()

    expect(view.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:error',
        detail: {message: 'Nope'},
      })
    )
    expect(firedTypes(view)).not.toContain('edit-mode:off')
    expect(clearDraftsWithPrefix).not.toHaveBeenCalled()
    expect(view._saving).toBe(false)
  })

  it('does not save an invalid form', async () => {
    const view = makeView()
    view._toggleEditMode()
    view._form.data = formData({title: ' '})

    await view._handleSave()

    expect(view.appState.apiPut).not.toHaveBeenCalled()
    expect(firedTypes(view)).toContain('grampsjs:error')
    expect(firedTypes(view)).not.toContain('edit-mode:off')
  })

  it('ignores the save button when not editing or inactive', async () => {
    const view = makeView()
    await view._handleSave()

    view._toggleEditMode()
    view.active = false
    await view._handleSave()

    expect(view.appState.apiPut).not.toHaveBeenCalled()
  })
})

describe('blog post page: saving after an error', () => {
  it('compares with the post as the server has it after an error', async () => {
    const apiPut = vi
      .fn()
      .mockResolvedValueOnce({data: []})
      .mockResolvedValueOnce({error: 'Nope'})
      .mockResolvedValue({data: []})
    const view = makeView({apiPut})
    view._toggleEditMode()
    // the note is saved first, as the post becomes private
    view._form.data = formData({private: true, text: text('Edited')})
    const savedNote = {...note, text: text('Edited'), private: true}
    view.appState.apiGet = vi.fn(async url =>
      url.startsWith('/api/sources/')
        ? {data: [makeSource({extended: {notes: [savedNote]}})]}
        : {data: [{handle: 'blog-tag', name: 'Blog'}]}
    )

    await view._handleSave()

    expect(view._editNote).toEqual(savedNote)
    expect(firedTypes(view)).not.toContain('edit-mode:off')

    view._form.data = formData({private: true, text: text('Hello')})
    await view._handleSave()

    expect(apiPut.mock.calls.slice(2).map(([url]) => url)).toEqual([
      '/api/notes/note-handle',
      '/api/sources/source-handle',
    ])
    expect(apiPut.mock.calls[2][1].text).toEqual(text('Hello'))
    expect(firedTypes(view)).toContain('edit-mode:off')
  })

  it('keeps the form from changing while saving', async () => {
    let resolvePut
    const apiPut = vi.fn(
      () =>
        new Promise(resolve => {
          resolvePut = resolve
        })
    )
    const view = makeView({apiPut})
    view._toggleEditMode()

    const saving = view._handleSave()
    await vi.waitFor(() => expect(apiPut).toHaveBeenCalled())
    expect(view._form.inert).toBe(true)

    resolvePut({data: []})
    await saving
    expect(view._form.inert).toBe(false)
  })
})

describe('blog post page: loading', () => {
  it('loads only a source with the Blog tag', async () => {
    const view = makeView()
    view.appState.apiGet = vi.fn().mockResolvedValue({data: []})

    await view._fetchData()

    const url = decodeURIComponent(view.appState.apiGet.mock.calls[0][0])
    expect(url).toContain(
      '{"rules":[{"name":"HasIdOf","values":["S1"]},{"name":"HasTag","values":["Blog"]}]}'
    )
    expect(view._dataSources).toEqual([])
  })
})

describe('blog post page: deleting', () => {
  beforeEach(() => {
    clearDraftsWithPrefix.mockClear()
  })

  it('deletes the post and goes to the blog, offering to undo', async () => {
    const view = makeView()
    view.appState.apiDelete = vi.fn().mockResolvedValue({data: ['undo']})
    view._toggleEditMode()

    await view._deleteSelf()

    expect(view.appState.apiDelete).toHaveBeenCalledWith(
      '/api/sources/source-handle',
      {dbChanged: false}
    )
    expect(view.edit).toBe(false)
    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('blog:S1:')
    expect(firedTypes(view)).toEqual(
      expect.arrayContaining(['nav', 'db:changed', 'transaction:undo'])
    )
    expect(view.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav', detail: {path: 'blog'}})
    )
    expect(view.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transaction:undo',
        detail: expect.objectContaining({
          transaction: ['undo'],
          redirect: 'blog/S1',
        }),
      })
    )
  })

  it('stays in edit mode and reports the error when deleting fails', async () => {
    const view = makeView()
    view.appState.apiDelete = vi.fn().mockResolvedValue({error: 'Nope'})
    view._toggleEditMode()

    await view._deleteSelf()

    expect(view.edit).toBe(true)
    expect(firedTypes(view)).not.toContain('nav')
    expect(view.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:error',
        detail: {message: 'Nope'},
      })
    )
  })

  it('deletes only the post being edited on the active page', async () => {
    const view = makeView()
    view.appState.apiDelete = vi.fn()

    await view._deleteSelf()
    view._toggleEditMode()
    view.active = false
    await view._deleteSelf()

    expect(view.appState.apiDelete).not.toHaveBeenCalled()
  })
})
