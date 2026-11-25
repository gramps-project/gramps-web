import {describe, it, expect, vi, beforeEach} from 'vitest'
import {clearDraftsWithPrefix} from '../../src/api.js'
import {GrampsjsBlogPostForm} from '../../src/components/GrampsjsBlogPostForm.js'

vi.mock('../../src/api.js', async importActual => {
  const actual = await importActual()
  return {...actual, clearDraftsWithPrefix: vi.fn()}
})

const dateAttr = value => ({_class: 'SrcAttribute', type: 'Date', value})
const text = string => ({_class: 'StyledText', string, tags: []})

const source = (props = {}) => ({
  handle: 'source-handle',
  gramps_id: 'S1',
  title: 'My post',
  author: 'Me',
  private: true,
  change: Date.UTC(2026, 10, 22, 12) / 1000,
  tag_list: ['blog-tag'],
  note_list: ['missing', 'note-handle'],
  media_list: [{ref: 'media-a', rect: [1, 2, 3, 4]}],
  attribute_list: [dateAttr('2024-03-05')],
  extended: {
    notes: [{handle: 'note-handle', text: text('Hello')}],
    media: [{handle: 'media-a', private: false, profile: {}}],
  },
  ...props,
})

// a form started with the source, as when it is rendered
const makeForm = src => {
  const form = new GrampsjsBlogPostForm()
  form.appState = {path: {page: 'blog', pageId: 'S1'}, i18n: {strings: {}}}
  form.source = src
  form.willUpdate(new Map([['source', null]]))
  return form
}

const formDataEvent = (id, detail) => {
  const target = document.createElement('div')
  target.id = id
  const event = new CustomEvent('formdata:changed', {detail})
  Object.defineProperty(event, 'composedPath', {value: () => [target]})
  vi.spyOn(event, 'stopPropagation')
  return event
}

describe('blog post form: initial values', () => {
  it('starts with the values of the post', () => {
    const form = makeForm(source())
    expect(form.data).toEqual({
      title: 'My post',
      author: 'Me',
      date: '2024-03-05',
      text: text('Hello'),
      media_list: [{ref: 'media-a', rect: [1, 2, 3, 4]}],
      media_updates: [],
      tag_list: ['blog-tag'],
      private: true,
    })
    expect(form.valid).toBe(true)
  })

  it('starts with the date the post shows without a date attribute', () => {
    const tz = process.env.TZ
    process.env.TZ = 'UTC'
    try {
      expect(makeForm(source({attribute_list: []})).data.date).toBe(
        '2026-11-22'
      )
    } finally {
      process.env.TZ = tz
    }
  })

  it('starts empty, dated today, without a post', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 22, 9, 30))
    try {
      const form = makeForm(null)
      expect(form.data).toMatchObject({
        title: '',
        date: '2026-11-22',
        text: {string: ''},
        media_list: [],
      })
      expect(form.valid).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts afresh with a new post', () => {
    const form = makeForm(source())
    const key = form._formKey
    form._set({title: 'Changed'})

    form.source = source({title: 'Other'})
    form.willUpdate(new Map([['source', null]]))

    expect(form.data.title).toBe('Other')
    expect(form._formKey).toBe(key + 1)
  })
})

describe('blog post form: changes', () => {
  it('needs a title and a valid date', () => {
    const form = makeForm(source())
    form._set({title: '  '})
    expect(form.valid).toBe(false)
    form._set({title: 'T', date: '2024-02-30'})
    expect(form.valid).toBe(false)
  })

  it('announces changes', () => {
    const form = makeForm(source())
    const changed = vi.fn()
    form.addEventListener('blog-post-form:changed', changed)

    form._handleDate({target: {value: '2020-01-01'}})

    expect(form.data.date).toBe('2020-01-01')
    expect(changed).toHaveBeenCalledOnce()
    expect(changed.mock.calls[0][0].detail.data.date).toBe('2020-01-01')
  })

  it('takes the author and privacy from their fields', () => {
    const form = makeForm(source())
    form._handleFormData(formDataEvent('author', {data: 'You'}))
    form._handleFormData(formDataEvent('private', {checked: false}))
    expect(form.data).toMatchObject({author: 'You', private: false})
  })

  it('lets other form data through', () => {
    const form = makeForm(source())
    const event = formDataEvent('other', {data: 'x'})
    form._handleFormData(event)
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })

  it('takes the text from the editor', () => {
    const form = makeForm(source())
    const event = {detail: {data: text('New')}, stopPropagation: vi.fn()}
    form._handleEditor(event)
    expect(form.data.text).toEqual(text('New'))
  })

  it('takes tags from the tag list', () => {
    const form = makeForm(source())
    const changed = vi.fn()
    form.addEventListener('blog-post-form:changed', changed)

    form._handleTagAction({
      detail: {action: 'updateProp', data: {tag_list: ['blog-tag', 'x']}},
      stopPropagation: vi.fn(),
    })

    expect(form.data.tag_list).toEqual(['blog-tag', 'x'])
    expect(changed).toHaveBeenCalledOnce()
  })
})

describe('blog post form: media', () => {
  const galleryAction = detail => ({detail, stopPropagation: vi.fn()})
  const refs = form => form.data.media_list.map(ref => ref.ref)

  const makeMediaForm = () => {
    const form = makeForm(
      source({
        media_list: [
          {ref: 'media-a', rect: [1, 2, 3, 4]},
          {ref: 'media-b'},
          {ref: 'missing'},
        ],
        extended: {
          notes: [],
          media: [
            {handle: 'media-a', private: false},
            {handle: 'media-b', private: true},
          ],
        },
      })
    )
    form.appState.apiGet = vi.fn().mockResolvedValue({
      data: {handle: 'media-c', private: false},
    })
    return form
  }

  it('shows the media of the post in the gallery, a missing one by handle', () => {
    const form = makeMediaForm()
    expect(form._galleryMedia()).toEqual([
      {handle: 'media-a', private: false},
      {handle: 'media-b', private: true},
      {handle: 'missing'},
    ])
  })

  it('moves and removes media, keeping their references', () => {
    const form = makeMediaForm()
    const event = galleryAction({action: 'moveListItem', index: 0, to: 2})

    form._handleGalleryAction(event)
    expect(refs(form)).toEqual(['media-b', 'missing', 'media-a'])
    expect(form.data.media_list[2].rect).toEqual([1, 2, 3, 4])
    expect(event.stopPropagation).toHaveBeenCalled()

    form._handleGalleryAction(galleryAction({action: 'delMediaRef', index: 1}))
    expect(refs(form)).toEqual(['media-b', 'media-a'])
  })

  it('adds media and loads their object', async () => {
    const form = makeMediaForm()

    form._handleGalleryAction(
      galleryAction({action: 'addMediaRef', data: {ref: 'media-c'}})
    )
    expect(form._galleryMedia()[3]).toEqual({handle: 'media-c'})
    await vi.waitFor(() => expect(form._media['media-c']).toBeDefined())

    expect(form.appState.apiGet).toHaveBeenCalledWith('/api/media/media-c')
    expect(form._galleryMedia()[3]).toEqual({handle: 'media-c', private: false})
  })

  it('does not load media it has', () => {
    const form = makeMediaForm()
    form._handleGalleryAction(
      galleryAction({action: 'addMediaRef', data: {ref: 'media-a'}})
    )
    expect(form.appState.apiGet).not.toHaveBeenCalled()
    expect(refs(form)).toEqual(['media-a', 'media-b', 'missing', 'media-a'])
  })

  it('keeps privacy changes of media until saving', () => {
    const form = makeMediaForm()
    const toggle = (handle, isPrivate) =>
      form._handleGalleryAction(
        galleryAction({
          action: 'updateLinkedMedia',
          media: {handle},
          data: {private: isPrivate},
        })
      )

    toggle('media-a', true)
    expect(form.data.media_updates).toEqual([
      {handle: 'media-a', private: true},
    ])
    expect(form._galleryMedia()[0].private).toBe(true)

    toggle('media-a', false)
    expect(form.data.media_updates).toEqual([])

    toggle('missing', true)
    expect(form.data.media_updates).toEqual([])
  })
})

describe('blog post form: reset', () => {
  beforeEach(() => {
    clearDraftsWithPrefix.mockClear()
  })

  it('starts afresh and discards the draft of the text', () => {
    const form = makeForm(source())
    const key = form._formKey
    form._set({title: 'Changed', text: text('Draft')})

    form.reset()

    expect(clearDraftsWithPrefix).toHaveBeenCalledWith('blog:S1:')
    expect(form.data.title).toBe('My post')
    expect(form.data.text).toEqual(text('Hello'))
    expect(form._formKey).toBe(key + 1)
  })
})

describe('blog post form: rendering', () => {
  it('fills its fields with the post', async () => {
    const form = document.createElement('grampsjs-blog-post-form')
    form.appState = {
      path: {page: 'blog', pageId: 'S1'},
      i18n: {lang: 'en', strings: {}},
      permissions: {canEdit: true},
      apiGet: vi.fn().mockResolvedValue({data: []}),
    }
    form.source = source()
    document.body.appendChild(form)
    try {
      await form.updateComplete
      const root = form.shadowRoot
      expect(root.getElementById('source-name').value).toBe('My post')
      expect(root.getElementById('blog-post-date').value).toBe('2024-03-05')
      expect(root.getElementById('author').value).toBe('Me')
      const editor = root.querySelector('grampsjs-editor')
      expect(editor.initialData).toEqual(text('Hello'))
      expect(editor.savedByForm).toBe(true)
      expect(root.querySelector('grampsjs-tags').hideTags).toEqual(['Blog'])
      const link = root.getElementById('source-link')
      expect(link.getAttribute('href')).toBe('/source/S1')
      expect(link.textContent.trim()).toBe('Source S1')
      const gallery = root.querySelector('grampsjs-gallery')
      expect(gallery.edit).toBe(true)
      expect(gallery.firstTileLabel).toBe('Cover image')
      expect(gallery.media.map(obj => obj.handle)).toEqual(['media-a'])
      expect(gallery.mediaRef).toEqual([{ref: 'media-a', rect: [1, 2, 3, 4]}])
      expect(root.getElementById('private').checked).toBe(true)
    } finally {
      form.remove()
    }
  })
})

describe('blog post form: source link', () => {
  it('is not shown for a new post', async () => {
    const form = document.createElement('grampsjs-blog-post-form')
    form.appState = {
      path: {page: 'new_blog_post', pageId: ''},
      i18n: {lang: 'en', strings: {}},
      permissions: {canEdit: true},
      apiGet: vi.fn().mockResolvedValue({data: []}),
    }
    document.body.appendChild(form)
    try {
      await form.updateComplete
      expect(form.shadowRoot.getElementById('source-link')).toBeNull()
    } finally {
      form.remove()
    }
  })
})

describe('editor saved by its form', () => {
  it('ignores the save button of edit mode', () => {
    const editor = document.createElement('grampsjs-editor')
    vi.spyOn(editor, 'dispatchEvent')

    editor.savedByForm = true
    editor._handleSaveButton()
    expect(editor.dispatchEvent).not.toHaveBeenCalled()

    editor.savedByForm = false
    editor._handleSaveButton()
    const types = editor.dispatchEvent.mock.calls.map(([e]) => e.type)
    expect(types).toContain('edit:action')
    expect(types).toContain('edit-mode:off')
  })
})
