import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsGallery.js'

// a gallery during a drag that would move the tile `from` to `to`
function galleryDragging(target) {
  const gallery = document.createElement('grampsjs-gallery')
  gallery._dragReorder = {target}
  return gallery
}

describe('first tile badge', () => {
  it('is on the first tile without a drag', () => {
    expect(galleryDragging(null)._firstTileIndex()).to.equal(0)
  })

  it('moves to the tile dragged to the front', () => {
    expect(galleryDragging({from: 2, to: 0})._firstTileIndex()).to.equal(2)
  })

  it('moves to the second tile when the first is dragged away', () => {
    expect(galleryDragging({from: 0, to: 2})._firstTileIndex()).to.equal(1)
  })

  it('stays on the first tile for moves behind it', () => {
    expect(galleryDragging({from: 1, to: 3})._firstTileIndex()).to.equal(0)
  })
})

describe('media privacy on the gallery', () => {
  it('asks to toggle the privacy of the media object', () => {
    const gallery = document.createElement('grampsjs-gallery')
    const media = {handle: 'm1', private: false}
    gallery.media = [media]
    const actions = []
    gallery.addEventListener('edit:action', e => actions.push(e.detail))
    gallery._handleMediaPrivacy(0)
    expect(actions).to.deep.equal([
      {action: 'updateLinkedMedia', media, data: {private: true}},
    ])
  })
})
