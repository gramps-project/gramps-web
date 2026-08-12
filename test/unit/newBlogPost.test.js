import {describe, it, expect, vi, beforeEach} from 'vitest'
import {clearDraftsWithPrefix} from '../../src/api.js'
import {GrampsjsViewNewBlogPost} from '../../src/views/GrampsjsViewNewBlogPost.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {...actual, clearDraftsWithPrefix: vi.fn()}
})

const makeElement = () => {
  const element = new GrampsjsViewNewBlogPost()
  element.createRenderRoot()
  return element
}

describe('new blog post: processed data', () => {
  it('creates a single Source object when there is no note', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'My trip to the archive'}

    const objects = element._processedData([])

    expect(objects).toHaveLength(1)
    expect(objects[0]).toMatchObject({
      _class: 'Source',
      title: 'My trip to the archive',
      tag_list: ['blog-tag-handle'],
      media_list: [],
    })
    expect(objects[0].note_list).toBeUndefined()
  })

  it('creates a Source and a linked Note when content is present', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'My trip to the archive',
      note: {_class: 'Note', text: {_class: 'StyledText', string: 'Hello'}},
    }
    const mediaRefs = [{ref: 'media-handle-1'}]

    const [source, note] = element._processedData(mediaRefs)

    expect(source.title).toBe('My trip to the archive')
    expect(source.note_list).toEqual([note.handle])
    expect(source.media_list).toBe(mediaRefs)
    expect(source.tag_list).toEqual(['blog-tag-handle'])
    expect(note.tag_list).toEqual(['blog-tag-handle'])
    expect(note.text.string).toBe('Hello')
  })

  it('deduplicates the Blog tag against tags the user already picked', () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'Title',
      tag_list: ['blog-tag-handle', 'other-tag'],
    }

    const [source] = element._processedData([])

    expect(source.tag_list).toEqual(['blog-tag-handle', 'other-tag'])
  })
})

describe('new blog post: Blog tag handling', () => {
  it('reuses an existing Blog tag', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({
      data: [{name: 'Blog', handle: 'existing-blog-handle'}],
    })
    const apiPost = vi.fn()
    element.appState = {apiGet, apiPost, i18n: {lang: 'en'}}

    await element._fetchBlogTagHandle()

    expect(element._blogTagHandle).toBe('existing-blog-handle')
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('creates the Blog tag when it does not exist yet, then retries', async () => {
    const element = makeElement()
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({data: []})
      .mockResolvedValueOnce({
        data: [{name: 'Blog', handle: 'new-blog-handle'}],
      })
    const apiPost = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en'}}

    await element._fetchBlogTagHandle()

    expect(apiPost).toHaveBeenCalledWith('/api/tags/', {name: 'Blog'})
    expect(apiGet).toHaveBeenCalledTimes(2)
    expect(element._blogTagHandle).toBe('new-blog-handle')
  })
})

describe('new blog post: media selection', () => {
  // The media picker (grampsjs-form-select-object-list, objectType="media")
  // emits a formdata:changed event from its inner id="media-list" list with
  // the array of selected handles.
  const makeMediaListEvent = data => {
    const target = document.createElement('div')
    target.id = 'media-list'
    const event = new CustomEvent('formdata:changed', {detail: {data}})
    Object.defineProperty(event, 'composedPath', {value: () => [target]})
    return event
  }

  // checkFormValidity() (called from _handleFormData) looks up #source-name,
  // so stub a minimal stand-in for it.
  const stubNameField = element => {
    const nameField = document.createElement('div')
    nameField.id = 'source-name'
    nameField.reportValidity = () => true
    nameField.validity = {valid: true}
    element.shadowRoot.append(nameField)
  }

  it('maps selected media handles to media_list refs', () => {
    const element = makeElement()
    stubNameField(element)
    element.data = {_class: 'Source', title: 'Title'}

    element._handleFormData(
      makeMediaListEvent(['media-handle-1', 'media-handle-2'])
    )

    expect(element.data.media_list).toEqual([
      {ref: 'media-handle-1'},
      {ref: 'media-handle-2'},
    ])
  })

  it('clears media_list when the selection is emptied', () => {
    const element = makeElement()
    stubNameField(element)
    element.data = {
      _class: 'Source',
      title: 'Title',
      media_list: [{ref: 'media-handle-1'}],
    }

    element._handleFormData(makeMediaListEvent([]))

    expect(element.data.media_list).toEqual([])
  })
})

describe('new blog post: submit', () => {
  beforeEach(() => {
    clearDraftsWithPrefix.mockClear()
  })

  it('applies the Blog tag, submits the picked media_list, and navigates to the new post', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {
      _class: 'Source',
      title: 'My trip to the archive',
      media_list: [{ref: 'media-handle-1'}],
    }
    element._reset = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Source', gramps_id: 'S0001'}}],
    })
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    expect(apiPost).toHaveBeenCalledWith(
      '/api/objects/',
      expect.arrayContaining([
        expect.objectContaining({
          title: 'My trip to the archive',
          media_list: [{ref: 'media-handle-1'}],
        }),
      ])
    )
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav', detail: {path: 'blog/S0001'}})
    )
    expect(element._reset).toHaveBeenCalledOnce()
    expect(element.error).toBe(false)
    expect(element._isSaving).toBe(false)
  })

  it('shows an error and does not submit when the Blog tag cannot be fetched', async () => {
    const element = makeElement()
    element._blogTagHandle = ''
    element._fetchBlogTagHandle = vi.fn().mockResolvedValue()
    const apiPost = vi.fn()
    element.appState = {apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Failed to fetch the Blog tag')
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('stays busy until the object-create request resolves, preventing double-submit', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    let resolveApiPost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolveApiPost = resolve
        })
    )
    element.appState = {apiPost, i18n: {strings: {}}}

    const submitPromise = element._submit()
    await Promise.resolve()
    await Promise.resolve()
    expect(element._isSaving).toBe(true)

    resolveApiPost({data: [{new: {_class: 'Source', gramps_id: 'S0001'}}]})
    await submitPromise

    expect(element._isSaving).toBe(false)
  })

  it('clears the busy state and reports the error without navigating when the create request fails', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    const apiPost = vi.fn().mockResolvedValue({error: 'Server exploded'})
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    expect(element._isSaving).toBe(false)
    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Server exploded')
    expect(element.dispatchEvent).not.toHaveBeenCalled()
  })

  it('ignores a second submit while the first one is still in flight', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    let resolveApiPost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolveApiPost = resolve
        })
    )
    element.appState = {apiPost, i18n: {strings: {}}}

    const submitPromise = element._submit()
    await element._submit()

    expect(apiPost).toHaveBeenCalledOnce()

    resolveApiPost({data: [{new: {_class: 'Source', gramps_id: 'S0001'}}]})
    await submitPromise
  })

  it('clears the editor draft for this page after a successful save', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    element._reset = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Source', gramps_id: 'S0001'}}],
    })
    element.appState = {
      apiPost,
      i18n: {strings: {}},
      path: {page: 'new_blog_post', pageId: ''},
    }

    await element._submit()

    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('new_blog_post::')
  })

  it('keeps the draft when the create request fails', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'Title'}
    const apiPost = vi.fn().mockResolvedValue({error: 'Server exploded'})
    element.appState = {
      apiPost,
      i18n: {strings: {}},
      path: {page: 'new_blog_post', pageId: ''},
    }

    await element._submit()

    expect(clearDraftsWithPrefix).not.toHaveBeenCalled()
  })
})
