import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsObjectPickerDialog.js'
import {hasThumbnail} from '../../src/util.js'

const media = (handle, mime) => ({
  object_type: 'media',
  handle,
  object: {handle, mime},
})

describe('object picker filter', () => {
  it('offers everything not excluded without a filter', () => {
    const picker = document.createElement('grampsjs-object-picker-dialog')
    picker.excludeHandles = ['b']
    expect(picker._isOffered(media('a', 'audio/mpeg'))).toBe(true)
    expect(picker._isOffered(media('b', 'image/jpeg'))).toBe(false)
  })

  it('offers only results accepted by the filter', () => {
    const picker = document.createElement('grampsjs-object-picker-dialog')
    picker.filter = obj => hasThumbnail(obj.object?.mime)
    expect(picker._isOffered(media('a', 'image/jpeg'))).toBe(true)
    expect(picker._isOffered(media('b', 'video/mp4'))).toBe(true)
    expect(picker._isOffered(media('c', 'audio/mpeg'))).toBe(false)
    expect(picker._isOffered(media('d', 'application/gpx+xml'))).toBe(false)
  })
})
