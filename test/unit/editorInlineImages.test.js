import {describe, it, expect, vi, beforeAll, afterAll, afterEach} from 'vitest'
import {getThumbnailUrl} from '../../src/api.js'
import {IMAGE_PLACEHOLDER, mediaLink} from '../../src/inlineImages.js'
import '../../src/components/GrampsjsEditor.js'

const GrampsjsEditor = customElements.get('grampsjs-editor')

// a text with an inline image of each handle, on lines of their own
const imageText = (...handles) => ({
  _class: 'StyledText',
  string: handles.map(() => IMAGE_PLACEHOLDER).join('\n'),
  tags: handles.map((handle, i) => ({
    _class: 'StyledTextTag',
    name: 'link',
    value: mediaLink(handle),
    ranges: [[2 * i, 2 * i + 1]],
  })),
})

// the media objects fetched for handles, without the missing ones
const apiGet = (media, missing = []) =>
  vi.fn(async url => {
    const handle = url.split('/').at(-1)
    return missing.includes(handle)
      ? {error: 'Not found', status: 404}
      : {data: {handle, checksum: media[handle]}}
  })

async function mountEditor(data, get) {
  const ed = new GrampsjsEditor()
  ed.appState = {
    path: {page: 'note', pageId: 'N1'},
    i18n: {strings: {}},
    apiGet: get,
  }
  ed.initialData = data
  document.body.append(ed)
  await ed.updateComplete
  return ed
}

const images = ed => [...ed.renderRoot.querySelectorAll('.inline-image img')]

// the source of each image of an HTML string
const sources = html => {
  const div = document.createElement('div')
  div.innerHTML = html
  return [...div.querySelectorAll('img')].map(img => img.getAttribute('src'))
}

// the thumbnail GrampsjsNoteContent shows for the media
const readingUrl = (handle, checksum) =>
  getThumbnailUrl(handle, 1000, false, checksum)

beforeAll(() => vi.stubGlobal('__APIHOST__', 'http://api.test'))
afterAll(() => vi.unstubAllGlobals())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('editor inline images', () => {
  it('shows the thumbnail of the reading view once the checksum is fetched', async () => {
    const get = apiGet({h1: 'abc'})
    const ed = await mountEditor(imageText('h1'), get)
    expect(get).toHaveBeenCalledWith('/api/media/h1')
    await vi.waitFor(() =>
      expect(images(ed)[0].getAttribute('src')).toBe(readingUrl('h1', 'abc'))
    )
    expect(sources(ed._html)).toEqual([readingUrl('h1', 'abc')])
  })

  it('has no image source while the checksum is fetched', async () => {
    const ed = await mountEditor(
      imageText('h1'),
      vi.fn(() => new Promise(() => {}))
    )
    expect(images(ed)).toHaveLength(1)
    expect(images(ed)[0].hasAttribute('src')).toBe(false)
  })

  it('fetches each media object once', async () => {
    const get = apiGet({h1: 'abc', h2: 'def'})
    const ed = await mountEditor(imageText('h1', 'h2', 'h1'), get)
    ed.data = {...ed.data}
    await ed.updateComplete
    expect(get.mock.calls.map(([url]) => url)).toEqual([
      '/api/media/h1',
      '/api/media/h2',
    ])
    await vi.waitFor(() =>
      expect(images(ed).map(img => img.getAttribute('src'))).toEqual([
        readingUrl('h1', 'abc'),
        readingUrl('h2', 'def'),
        readingUrl('h1', 'abc'),
      ])
    )
  })

  it('shows media that cannot be fetched without a checksum', async () => {
    const ed = await mountEditor(imageText('h1'), apiGet({}, ['h1']))
    await vi.waitFor(() =>
      expect(images(ed)[0].getAttribute('src')).toBe(readingUrl('h1', null))
    )
  })

  it('uses the checksum of an image chosen in the picker', async () => {
    const get = apiGet({})
    const ed = await mountEditor(
      {_class: 'StyledText', string: '', tags: []},
      get
    )
    ed._imagePosition = [0, 0]
    ed._handleImageSelected({
      stopPropagation() {},
      detail: {
        objects: [{handle: 'h3', object: {handle: 'h3', checksum: 'ghi'}}],
      },
    })
    await ed.updateComplete
    expect(get).not.toHaveBeenCalled()
    expect(images(ed)[0].getAttribute('src')).toBe(readingUrl('h3', 'ghi'))
  })
})
