import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewMediaObjects} from '../../src/views/GrampsjsViewMediaObjects.js'
import {GrampsjsViewMediaLightbox} from '../../src/views/GrampsjsViewMediaLightbox.js'

const rowsOf = (...handles) => handles.map(handle => ({handle}))
const fromLightbox = {detail: {id: 'gallery-lightbox'}}

function makeView({rows = rowsOf('a', 'b', 'c'), page = 1, pages = 1} = {}) {
  const view = Object.create(GrampsjsViewMediaObjects.prototype)
  // a detached instance has no update cycle
  view.requestUpdate = () => {}
  view._rawData = rows
  view._page = page
  view._pages = pages
  view._lightboxIndex = 0
  view._lightboxPending = null
  view._selectedHandles = []
  view._allMatchingRows = null
  view._selectAllRequest = null
  view.dispatchEvent = vi.fn()
  return view
}

// what the view does before rendering the requested page
function loadPage(view, rows) {
  view._rawData = rows
  view.loading = false
  view.willUpdate(new Map([['loading', true]]))
}

describe('browsing media in the lightbox', () => {
  it('steps through the media on the page', () => {
    const view = makeView()
    view._handleLightboxRight(fromLightbox)
    view._handleLightboxRight(fromLightbox)
    expect(view._lightboxIndex).toBe(2)
    view._handleLightboxLeft(fromLightbox)
    expect(view._lightboxIndex).toBe(1)
  })

  it('stops at the ends of the last page', () => {
    const view = makeView()
    view._handleLightboxLeft(fromLightbox)
    expect(view._lightboxIndex).toBe(0)
    view._lightboxIndex = 2
    view._handleLightboxRight(fromLightbox)
    expect(view._lightboxIndex).toBe(2)
    expect(view._page).toBe(1)
  })

  it('moves on to the first media of the next page', () => {
    const view = makeView({pages: 2})
    view._lightboxIndex = 2
    view._handleLightboxRight(fromLightbox)
    expect(view._page).toBe(2)

    // further steps wait for the page
    view._handleLightboxRight(fromLightbox)
    expect(view._page).toBe(2)

    loadPage(view, rowsOf('d', 'e'))
    expect(view._lightboxIndex).toBe(0)
    expect(view._lightboxPending).toBe(null)
  })

  it('moves back to the last media of the previous page', () => {
    const view = makeView({page: 2, pages: 2})
    view._handleLightboxLeft(fromLightbox)
    expect(view._page).toBe(1)
    loadPage(view, rowsOf('x', 'y', 'z'))
    expect(view._lightboxIndex).toBe(2)
  })

  it('ignores the arrows of other lightboxes', () => {
    const view = makeView()
    view._handleLightboxRight({detail: {id: 'other'}})
    expect(view._lightboxIndex).toBe(0)
  })
})

describe('selecting media', () => {
  it('toggles a single media', () => {
    const view = makeView()
    view._toggleSelected(1)
    view._toggleSelected(2)
    expect(view._selectedHandles).toEqual(['b', 'c'])
    view._toggleSelected(1)
    expect(view._selectedHandles).toEqual(['c'])
  })

  it('selects and deselects the whole page', () => {
    const view = makeView()
    view._toggleSelected(0)
    view._handleSelectPage()
    expect(view._selectedHandles).toEqual(['a', 'b', 'c'])
    view._handleSelectPage()
    expect(view._selectedHandles).toEqual([])
  })

  it('narrows a selection of all matching media to the page', () => {
    const view = makeView()
    view._allMatchingRows = rowsOf('a', 'b', 'c', 'd')
    view._selectedHandles = ['a', 'b', 'c', 'd']
    view._toggleSelected(0)
    expect(view._selectedHandles).toEqual(['b', 'c'])
    expect(view._allMatchingRows).toBe(null)
  })
})

describe('loading the media shown in the lightbox', () => {
  function makeLightbox() {
    const lightbox = Object.create(GrampsjsViewMediaLightbox.prototype)
    lightbox.requestUpdate = () => {}
    const responses = {}
    lightbox.appState = {
      i18n: {lang: 'en'},
      apiGet: vi.fn(
        url =>
          new Promise(resolve => {
            responses[url.split('?')[0].split('/').pop()] = resolve
          })
      ),
    }
    return {lightbox, responses}
  }

  function show(lightbox, handle) {
    lightbox.handle = handle
    lightbox._updateData()
  }

  it('ignores a late response for media shown earlier', async () => {
    const {lightbox, responses} = makeLightbox()
    show(lightbox, 'a')
    show(lightbox, 'c')
    responses.c({data: {handle: 'c'}})
    responses.a({data: {handle: 'a'}})
    await Promise.resolve()
    await Promise.resolve()
    expect(lightbox._data).toEqual({handle: 'c'})
  })
})
