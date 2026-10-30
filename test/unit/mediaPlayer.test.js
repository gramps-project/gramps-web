import {describe, it, expect, afterEach} from 'vitest'
import {
  mdiFile,
  mdiFileMusic,
  mdiFileVideo,
  mdiImageBroken,
  mdiMap,
} from '@mdi/js'
import {isPlayableMime} from '../../src/components/GrampsjsMediaPlayer.js'
import '../../src/components/GrampsjsImg.js'
import {fireEvent} from '../../src/util.js'

const mount = async (tag, props) => {
  const el = document.createElement(tag)
  Object.assign(el, props)
  document.body.append(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isPlayableMime', () => {
  it('accepts audio and video', () => {
    expect(isPlayableMime('audio/mpeg')).toBe(true)
    expect(isPlayableMime('video/mp4')).toBe(true)
  })

  it('rejects other and missing types', () => {
    expect(isPlayableMime('image/jpeg')).toBe(false)
    expect(isPlayableMime('application/pdf')).toBe(false)
    expect(isPlayableMime('')).toBe(false)
    expect(isPlayableMime(undefined)).toBe(false)
  })
})

describe('grampsjs-media-player', () => {
  it('renders a video player for video', async () => {
    const el = await mount('grampsjs-media-player', {
      handle: 'h1',
      mime: 'video/mp4',
    })
    const video = el.shadowRoot.querySelector('video')
    expect(video.controls).toBe(true)
    expect(video.getAttribute('src')).toContain('/api/media/h1/file')
  })

  it('renders an audio player for audio', async () => {
    const el = await mount('grampsjs-media-player', {
      handle: 'h1',
      mime: 'audio/mpeg',
    })
    expect(el.shadowRoot.querySelector('audio')).not.toBeNull()
    const img = el.shadowRoot.querySelector('grampsjs-img')
    await img.updateComplete
    const path = img.shadowRoot.querySelector('svg.placeholder path')
    expect(path.getAttribute('d')).toBe(mdiFileMusic)
  })

  it('reloads the source when the handle changes', async () => {
    const el = await mount('grampsjs-media-player', {
      handle: 'h1',
      mime: 'video/mp4',
    })
    el.handle = 'h2'
    await el.updateComplete
    const src = el.shadowRoot.querySelector('video').getAttribute('src')
    expect(src).toContain('/api/media/h2/file')
  })
})

describe('grampsjs-img placeholders', () => {
  const placeholderPath = el =>
    el.shadowRoot.querySelector('svg.placeholder path')?.getAttribute('d') ??
    null

  it.each([
    ['audio/mpeg', mdiFileMusic],
    ['application/vnd.google-earth.kml+xml', mdiMap],
    ['application/geo+json', mdiMap],
    ['application/gpx+xml', mdiMap],
    ['application/zip', mdiFile],
  ])('renders a placeholder for %s', async (mime, path) => {
    for (const square of [true, false]) {
      // eslint-disable-next-line no-await-in-loop
      const el = await mount('grampsjs-img', {
        handle: 'h',
        size: 300,
        mime,
        square,
      })
      expect(placeholderPath(el)).toBe(path)
      expect(el.shadowRoot.querySelector('audio, video')).toBeNull()
    }
  })

  it.each(['image/jpeg', 'video/mp4', 'application/pdf', ''])(
    'renders a thumbnail for %s',
    async mime => {
      const el = await mount('grampsjs-img', {handle: 'h', size: 300, mime})
      expect(placeholderPath(el)).toBeNull()
      expect(el.shadowRoot.querySelector('img').src).toContain('/thumbnail/')
    }
  )

  it('marks video thumbnails with a play button', async () => {
    const video = await mount('grampsjs-img', {
      handle: 'h',
      size: 300,
      mime: 'video/mp4',
    })
    expect(video.shadowRoot.querySelector('.play')).not.toBeNull()
    const image = await mount('grampsjs-img', {
      handle: 'h',
      size: 300,
      mime: 'image/jpeg',
    })
    expect(image.shadowRoot.querySelector('.play')).toBeNull()
  })

  it('renders a video placeholder when the video thumbnail fails', async () => {
    const el = await mount('grampsjs-img', {
      handle: 'h',
      size: 300,
      mime: 'video/mp4',
    })
    fireEvent(el.shadowRoot.querySelector('img'), 'error')
    await el.updateComplete
    expect(placeholderPath(el)).toBe(mdiFileVideo)
  })

  it('renders a broken image when an image thumbnail fails', async () => {
    const el = await mount('grampsjs-img', {
      handle: 'h',
      size: 300,
      mime: 'image/jpeg',
    })
    fireEvent(el.shadowRoot.querySelector('img'), 'error')
    await el.updateComplete
    expect(placeholderPath(el)).toBe(mdiImageBroken)
  })

  it.each([
    ['application/pdf', mdiFile],
    ['', mdiImageBroken],
  ])('renders the icon for a failed %s thumbnail', async (mime, path) => {
    const el = await mount('grampsjs-img', {handle: 'h', size: 300, mime})
    fireEvent(el.shadowRoot.querySelector('img'), 'error')
    await el.updateComplete
    expect(placeholderPath(el)).toBe(path)
  })

  it('prefers the fallback icon when a thumbnail fails', async () => {
    const el = await mount('grampsjs-img', {
      handle: 'h',
      size: 40,
      mime: 'video/mp4',
      fallbackIcon: mdiMap,
    })
    fireEvent(el.shadowRoot.querySelector('img'), 'error')
    await el.updateComplete
    expect(placeholderPath(el)).toBe(mdiMap)
  })
})
