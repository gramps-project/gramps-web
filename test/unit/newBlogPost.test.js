import {describe, it, expect, vi, beforeEach} from 'vitest'
import {GrampsjsViewNewBlogPost} from '../../src/views/GrampsjsViewNewBlogPost.js'
import {clearTagCache} from '../../src/tags.js'

const text = string => ({_class: 'StyledText', string, tags: []})

const formData = (props = {}) => ({
  title: 'My trip to the archive',
  author: '',
  date: '2026-11-22',
  text: text(''),
  media_list: [],
  tag_list: [],
  private: false,
  ...props,
})

// the page with a stand-in for its form
const makeElement = (data = formData()) => {
  const element = new GrampsjsViewNewBlogPost()
  element.createRenderRoot()
  const form = {data, reset: vi.fn()}
  Object.defineProperty(element, '_form', {get: () => form})
  return element
}

describe('new blog post: form validity', () => {
  it('needs a title and a valid date', () => {
    const element = makeElement()
    const changed = data => element._handleFormChanged({detail: {data}})

    changed(formData())
    expect(element._isFormValid).toBe(true)

    changed(formData({title: '  '}))
    expect(element._isFormValid).toBe(false)

    changed(formData({date: ''}))
    expect(element._isFormValid).toBe(false)
  })
})

describe('new blog post: Blog tag handling', () => {
  beforeEach(() => {
    clearTagCache()
  })

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

  it('does not create a tag while merely looking one up', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const apiPost = vi.fn()
    element.appState = {apiGet, apiPost, i18n: {lang: 'en'}}

    await element._fetchBlogTagHandle()

    expect(apiPost).not.toHaveBeenCalled()
    expect(element._blogTagHandle).toBe('')
  })

  it('picks up the handle after creating the Blog tag', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({
      data: [{name: 'Blog', handle: 'new-blog-handle'}],
    })
    const apiPost = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(apiPost).toHaveBeenCalledWith('/api/tags/', {name: 'Blog'})
    expect(element._blogTagHandle).toBe('new-blog-handle')
    expect(errorMessage).toBe('')
  })

  it('reports the backend error when the Blog tag cannot be created', async () => {
    const element = makeElement()
    const apiGet = vi.fn()
    const apiPost = vi.fn().mockResolvedValue({error: 'Not authorized'})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(errorMessage).toBe('Not authorized')
    expect(apiGet).not.toHaveBeenCalled()
    expect(element._blogTagHandle).toBe('')
  })

  it('reports a generic error when the created tag cannot be found', async () => {
    const element = makeElement()
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const apiPost = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiGet, apiPost, i18n: {lang: 'en', strings: {}}}

    const errorMessage = await element._createBlogTag()

    expect(errorMessage).toBe('Failed to fetch the Blog tag')
  })
})

describe('new blog post: submit', () => {
  const created = {data: [{new: {_class: 'Source', gramps_id: 'S0001'}}]}

  it('adds the post from the form and goes to it', async () => {
    const element = makeElement(
      formData({
        text: text('Hello'),
        media_list: [{ref: 'media-handle-1'}],
      })
    )
    element._blogTagHandle = 'blog-tag-handle'
    const apiPost = vi.fn().mockResolvedValue(created)
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    const [url, objects] = apiPost.mock.calls[0]
    expect(url).toBe('/api/objects/')
    expect(objects[0]).toMatchObject({
      _class: 'Source',
      title: 'My trip to the archive',
      media_list: [{ref: 'media-handle-1'}],
      tag_list: ['blog-tag-handle'],
      attribute_list: [
        {_class: 'SrcAttribute', type: 'Date', value: '2026-11-22'},
      ],
    })
    expect(objects[1]).toMatchObject({_class: 'Note', text: text('Hello')})
    expect(element._form.reset).toHaveBeenCalledOnce()
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav', detail: {path: 'blog/S0001'}})
    )
    expect(element.error).toBe(false)
    expect(element._isSaving).toBe(false)
  })

  it('saves changed media privacy before adding the post', async () => {
    const element = makeElement(
      formData({
        media_list: [{ref: 'media-a'}],
        media_updates: [{handle: 'media-a', private: true}],
      })
    )
    element._blogTagHandle = 'blog-tag-handle'
    const order = []
    const apiPut = vi.fn(async url => {
      order.push(url)
      return {data: []}
    })
    const apiPost = vi.fn(async url => {
      order.push(url)
      return created
    })
    element.appState = {apiPut, apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(order).toEqual(['/api/media/media-a', '/api/objects/'])
  })

  it('does not add the post when saving media fails', async () => {
    const element = makeElement(
      formData({
        media_list: [{ref: 'media-a'}],
        media_updates: [{handle: 'media-a', private: true}],
      })
    )
    element._blogTagHandle = 'blog-tag-handle'
    const apiPut = vi.fn().mockResolvedValue({error: 'Nope'})
    const apiPost = vi.fn()
    element.appState = {apiPut, apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(apiPost).not.toHaveBeenCalled()
    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Nope')
    expect(element._isSaving).toBe(false)
  })

  it('creates the Blog tag on submit when the tree does not have one', async () => {
    const element = makeElement()
    element._fetchBlogTagHandle = vi.fn().mockResolvedValue()
    element._createBlogTag = vi.fn().mockImplementation(async () => {
      element._blogTagHandle = 'new-blog-handle'
      return ''
    })
    const apiPost = vi.fn().mockResolvedValue(created)
    element.appState = {apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(element._createBlogTag).toHaveBeenCalledOnce()
    expect(apiPost.mock.calls[0][1][0].tag_list).toEqual(['new-blog-handle'])
    expect(element.error).toBe(false)
  })

  it('shows an error and does not submit when the Blog tag cannot be created', async () => {
    const element = makeElement()
    element._fetchBlogTagHandle = vi.fn().mockResolvedValue()
    const apiPost = vi.fn().mockResolvedValue({error: 'Not authorized'})
    element.appState = {apiPost, i18n: {strings: {}}}

    await element._submit()

    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Not authorized')
    expect(apiPost).toHaveBeenCalledOnce()
    expect(apiPost).toHaveBeenCalledWith('/api/tags/', {name: 'Blog'})
    expect(element._isSaving).toBe(false)
  })

  it('keeps the form and reports the error when the create request fails', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    const apiPost = vi.fn().mockResolvedValue({error: 'Server exploded'})
    element.appState = {apiPost, i18n: {strings: {}}}
    vi.spyOn(element, 'dispatchEvent')

    await element._submit()

    expect(element._isSaving).toBe(false)
    expect(element.error).toBe(true)
    expect(element._errorMessage).toBe('Server exploded')
    expect(element._form.reset).not.toHaveBeenCalled()
    expect(element.dispatchEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav'})
    )
  })

  it('keeps the form from changing while adding', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    let resolveApiPost
    const apiPost = vi.fn(
      () =>
        new Promise(resolve => {
          resolveApiPost = resolve
        })
    )
    element.appState = {apiPost, i18n: {strings: {}}}

    const submitPromise = element._submit()
    await vi.waitFor(() => expect(apiPost).toHaveBeenCalled())
    expect(element._form.inert).toBe(true)

    resolveApiPost(created)
    await submitPromise
    expect(element._form.inert).toBe(false)
  })

  it('ignores a second submit while the first one is still in flight', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
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
    expect(element._isSaving).toBe(true)
    expect(apiPost).toHaveBeenCalledOnce()

    resolveApiPost(created)
    await submitPromise
    expect(element._isSaving).toBe(false)
  })
})
