import {describe, it, expect} from 'vitest'
import {renderIcon} from '../../src/objectRender.js'

describe('renderIcon checksum', () => {
  it('uses checksum from media object itself', () => {
    const obj = {
      object_type: 'media',
      object: {handle: 'mh1', checksum: 'abc123'},
    }
    expect(renderIcon(obj).values).to.include('abc123')
  })

  it('resolves checksum from extended.media for non-media objects', () => {
    const obj = {
      object_type: 'person',
      object: {
        handle: 'ph1',
        media_list: [{ref: 'mh2', rect: []}],
        extended: {
          media: [{handle: 'mh2', checksum: 'def456'}],
        },
      },
    }
    expect(renderIcon(obj).values).to.include('def456')
  })
})
