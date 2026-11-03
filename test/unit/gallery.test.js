import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsGallery.js'

// a gallery during a drag that would move the tile `from` to `to`
function galleryDragging(target) {
  const gallery = document.createElement('grampsjs-gallery')
  gallery._dragReorder = {target}
  return gallery
}

describe('profile picture badge', () => {
  it('is on the first tile without a drag', () => {
    expect(galleryDragging(null)._profilePictureIndex()).to.equal(0)
  })

  it('moves to the tile dragged to the front', () => {
    expect(galleryDragging({from: 2, to: 0})._profilePictureIndex()).to.equal(2)
  })

  it('moves to the second tile when the first is dragged away', () => {
    expect(galleryDragging({from: 0, to: 2})._profilePictureIndex()).to.equal(1)
  })

  it('stays on the first tile for moves behind it', () => {
    expect(galleryDragging({from: 1, to: 3})._profilePictureIndex()).to.equal(0)
  })
})
