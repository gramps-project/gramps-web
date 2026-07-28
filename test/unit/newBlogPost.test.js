import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewNewBlogPost} from '../../src/views/GrampsjsViewNewBlogPost.js'

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

describe('new blog post: media upload', () => {
  it('resolves with no media refs when no files are selected', async () => {
    const element = makeElement()
    const uploadEl = document.createElement('div')
    uploadEl.id = 'upload'
    uploadEl.files = []
    element.shadowRoot.append(uploadEl)
    const apiPost = vi.fn()
    element.appState = {apiPost, apiPut: vi.fn()}

    const result = await element._uploadMedia()

    expect(result).toEqual({data: []})
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('uploads each file and updates its metadata', async () => {
    const element = makeElement()
    const file = new File(['x'], 'holiday.jpg', {type: 'image/jpeg'})
    const uploadEl = document.createElement('div')
    uploadEl.id = 'upload'
    uploadEl.files = [file]
    element.shadowRoot.append(uploadEl)

    const apiPost = vi.fn().mockResolvedValue({
      data: [{new: {_class: 'Media', handle: 'media-handle-1'}}],
    })
    const apiPut = vi.fn().mockResolvedValue({data: {}})
    element.appState = {apiPost, apiPut}

    const result = await element._uploadMedia()

    expect(apiPost).toHaveBeenCalledWith('/api/media/', file, {
      isJson: false,
      dbChanged: false,
    })
    expect(apiPut).toHaveBeenCalledWith(
      '/api/media/media-handle-1',
      expect.objectContaining({handle: 'media-handle-1', desc: 'holiday'}),
      {dbChanged: false}
    )
    expect(result).toEqual({data: [{ref: 'media-handle-1'}]})
  })

  it('stops and reports the error when the upload fails', async () => {
    const element = makeElement()
    const file = new File(['x'], 'holiday.jpg', {type: 'image/jpeg'})
    const uploadEl = document.createElement('div')
    uploadEl.id = 'upload'
    uploadEl.files = [file]
    element.shadowRoot.append(uploadEl)

    const apiPost = vi.fn().mockResolvedValue({error: 'Upload failed'})
    const apiPut = vi.fn()
    element.appState = {apiPost, apiPut}

    const result = await element._uploadMedia()

    expect(result).toEqual({error: 'Upload failed'})
    expect(apiPut).not.toHaveBeenCalled()
  })
})

describe('new blog post: submit', () => {
  it('uploads media, applies the Blog tag, and navigates to the new post', async () => {
    const element = makeElement()
    element._blogTagHandle = 'blog-tag-handle'
    element.data = {_class: 'Source', title: 'My trip to the archive'}
    element._uploadMedia = vi.fn().mockResolvedValue({data: []})
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
        expect.objectContaining({title: 'My trip to the archive'}),
      ])
    )
    expect(element.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({type: 'nav', detail: {path: 'blog/S0001'}})
    )
    expect(element._reset).toHaveBeenCalledOnce()
    expect(element.error).toBe(false)
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
})
