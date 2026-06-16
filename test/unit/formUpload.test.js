import {describe, it, expect, vi} from 'vitest'

import '../../src/components/GrampsjsFormUpload.js'

const makeClipboardFileItem = file => ({
  kind: 'file',
  getAsFile: () => file,
})

const makePasteEvent = items => ({
  clipboardData: {items},
  preventDefault: vi.fn(),
  stopImmediatePropagation: vi.fn(),
})

describe('GrampsjsFormUpload', () => {
  it('accepts any file when accept is not set', () => {
    const el = document.createElement('grampsjs-form-upload')
    const file = new File(['x'], 'photo.png', {type: 'image/png'})

    expect(el._acceptsFile(file)).toBe(true)
  })

  it('matches extension and mime accept filters', () => {
    const el = document.createElement('grampsjs-form-upload')

    el.accept = '.jpg, image/png, image/*'

    expect(
      el._acceptsFile(new File(['x'], 'portrait.JPG', {type: 'image/jpeg'}))
    ).toBe(true)
    expect(
      el._acceptsFile(new File(['x'], 'icon.bin', {type: 'image/png'}))
    ).toBe(true)
    expect(
      el._acceptsFile(new File(['x'], 'scan.webp', {type: 'image/webp'}))
    ).toBe(true)
    expect(
      el._acceptsFile(new File(['x'], 'doc.pdf', {type: 'application/pdf'}))
    ).toBe(false)
  })

  it('ignores paste when not visible', () => {
    const el = document.createElement('grampsjs-form-upload')
    const event = makePasteEvent([
      makeClipboardFileItem(new File(['x'], 'photo.png', {type: 'image/png'})),
    ])

    el._isVisible = false
    el._handlePaste(event)

    expect(el.files).toEqual([])
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  it('uses first pasted file in single mode and emits change flow', () => {
    const el = document.createElement('grampsjs-form-upload')
    const png = new File(['x'], 'photo.png', {type: 'image/png'})
    const jpg = new File(['x'], 'photo.jpg', {type: 'image/jpeg'})
    const event = makePasteEvent([
      makeClipboardFileItem(png),
      makeClipboardFileItem(jpg),
    ])

    el._isVisible = true
    el.multiple = false
    el._processPreview = vi.fn()
    el.handleChange = vi.fn()

    el._handlePaste(event)

    expect(el.files).toEqual([png])
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1)
    expect(el._processPreview).toHaveBeenCalledTimes(1)
    expect(el.handleChange).toHaveBeenCalledTimes(1)
  })

  it('appends accepted pasted files in multiple mode', () => {
    const el = document.createElement('grampsjs-form-upload')
    const existing = new File(['x'], 'existing.png', {type: 'image/png'})
    const pastedOk = new File(['x'], 'new.jpg', {type: 'image/jpeg'})
    const pastedReject = new File(['x'], 'doc.pdf', {type: 'application/pdf'})
    const event = makePasteEvent([
      makeClipboardFileItem(pastedReject),
      makeClipboardFileItem(pastedOk),
    ])

    el._isVisible = true
    el.multiple = true
    el.accept = 'image/*'
    el.files = [existing]
    el._processPreview = vi.fn()
    el.handleChange = vi.fn()

    el._handlePaste(event)

    expect(el.files).toEqual([existing, pastedOk])
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1)
    expect(el._processPreview).toHaveBeenCalledTimes(1)
    expect(el.handleChange).toHaveBeenCalledTimes(1)
  })

  it('does not consume paste when no accepted file is present', () => {
    const el = document.createElement('grampsjs-form-upload')
    const event = makePasteEvent([
      makeClipboardFileItem(
        new File(['x'], 'doc.pdf', {type: 'application/pdf'})
      ),
    ])

    el._isVisible = true
    el.accept = 'image/*'
    el._processPreview = vi.fn()
    el.handleChange = vi.fn()

    el._handlePaste(event)

    expect(el.files).toEqual([])
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled()
    expect(el._processPreview).not.toHaveBeenCalled()
    expect(el.handleChange).not.toHaveBeenCalled()
  })
})
