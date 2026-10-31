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

describe('zooming the media in the lightbox', () => {
  // The untransformed image is centered at (500, 400)
  function makeLightbox() {
    const lightbox = Object.create(GrampsjsViewMediaLightbox.prototype)
    lightbox.requestUpdate = () => {}
    lightbox._resetZoom()
    const wrapper = {
      getBoundingClientRect: () => ({
        left: 500 + lightbox._panX - 100 * lightbox._zoom,
        top: 400 + lightbox._panY - 100 * lightbox._zoom,
        width: 200 * lightbox._zoom,
        height: 200 * lightbox._zoom,
      }),
    }
    return {lightbox, wrapper}
  }

  // The image point shown at a screen point, relative to the image center
  function imagePointAt(lightbox, x, y) {
    return [
      (x - 500 - lightbox._panX) / lightbox._zoom,
      (y - 400 - lightbox._panY) / lightbox._zoom,
    ]
  }

  function touches(...points) {
    return points.map(([clientX, clientY]) => ({clientX, clientY}))
  }

  function touchEvent(wrapper, ...points) {
    return {
      currentTarget: wrapper,
      touches: touches(...points),
      stopPropagation: () => {},
      preventDefault: () => {},
    }
  }

  it('keeps the center of the panned view in place with the buttons', () => {
    const {lightbox} = makeLightbox()
    lightbox._setZoomPan(2, 100, 50)
    const before = imagePointAt(lightbox, 500, 400)
    lightbox._handleZoomIn()
    expect(lightbox._zoom).toBe(3)
    expect(imagePointAt(lightbox, 500, 400)).toEqual(before)
    lightbox._handleZoomOut()
    expect(lightbox._zoom).toBe(2)
    expect(imagePointAt(lightbox, 500, 400)).toEqual(before)
  })

  it('keeps the point under the mouse in place when scrolling', () => {
    const {lightbox, wrapper} = makeLightbox()
    lightbox._setZoomPan(2, 40, -20)
    const before = imagePointAt(lightbox, 560, 430)
    lightbox._handleWheel({
      currentTarget: wrapper,
      clientX: 560,
      clientY: 430,
      deltaY: -1,
      preventDefault: () => {},
      stopPropagation: () => {},
    })
    expect(lightbox._zoom).toBeCloseTo(2.2)
    const after = imagePointAt(lightbox, 560, 430)
    expect(after[0]).toBeCloseTo(before[0])
    expect(after[1]).toBeCloseTo(before[1])
  })

  it('keeps the point under the pinch center under it', () => {
    const {lightbox, wrapper} = makeLightbox()
    lightbox._setZoomPan(2, 40, -20)
    const before = imagePointAt(lightbox, 550, 450)
    lightbox._handleTouchStart(touchEvent(wrapper, [530, 450], [570, 450]))
    lightbox._handleTouchMove(touchEvent(wrapper, [510, 450], [590, 450]))
    expect(lightbox._zoom).toBe(4)
    expect(imagePointAt(lightbox, 550, 450)).toEqual(before)
    // moving both fingers pans along
    lightbox._handleTouchMove(touchEvent(wrapper, [520, 460], [600, 460]))
    expect(imagePointAt(lightbox, 560, 460)).toEqual(before)
  })

  it('pans with the remaining finger from where the pinch ended', () => {
    const {lightbox, wrapper} = makeLightbox()
    lightbox._setZoomPan(2, 0, 0)
    lightbox._handleTouchStart(touchEvent(wrapper, [530, 450], [570, 450]))
    lightbox._handleTouchMove(touchEvent(wrapper, [510, 450], [590, 450]))
    const pan = [lightbox._panX, lightbox._panY]
    lightbox._handleTouchEnd(touchEvent(wrapper, [590, 450]))
    lightbox._handleTouchMove(touchEvent(wrapper, [600, 455]))
    expect([lightbox._panX, lightbox._panY]).toEqual([pan[0] + 10, pan[1] + 5])
  })

  it('recenters when zoomed all the way out', () => {
    const {lightbox, wrapper} = makeLightbox()
    lightbox._setZoomPan(1.2, 30, 30)
    lightbox._handleZoomOut()
    expect([lightbox._zoom, lightbox._panX, lightbox._panY]).toEqual([1, 0, 0])
    lightbox._handleWheel({
      currentTarget: wrapper,
      clientX: 560,
      clientY: 430,
      deltaY: 1,
      preventDefault: () => {},
      stopPropagation: () => {},
    })
    expect([lightbox._zoom, lightbox._panX, lightbox._panY]).toEqual([1, 0, 0])
  })
})
