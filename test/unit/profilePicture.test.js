import {describe, it, expect, vi} from 'vitest'
import {GrampsjsPerson} from '../../src/components/GrampsjsPerson.js'
import {GrampsjsGallery} from '../../src/components/GrampsjsGallery.js'

const appState = {i18n: {strings: {}}}

const saveEvent = data => ({
  detail: {data},
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
})

const makeGallery = () => {
  const gallery = new GrampsjsGallery()
  gallery.appState = appState
  gallery.edit = true
  gallery.renderRoot = gallery.createRenderRoot()
  return gallery
}

describe('person profile picture actions', () => {
  it('opens the existing upload and link flows only in edit mode', () => {
    const person = new GrampsjsPerson()
    person.renderRoot = person.createRenderRoot()
    const gallery = makeGallery()
    person.renderRoot.append(gallery)
    const upload = vi.spyOn(gallery, 'openNewMedia')
    const link = vi.spyOn(gallery, 'openMediaRef')

    person._addProfilePicture('upload')
    expect(upload).not.toHaveBeenCalled()
    person.edit = true
    person._addProfilePicture('upload')
    expect(upload).toHaveBeenCalledOnce()
    person._addProfilePicture('link')
    expect(link).toHaveBeenCalledOnce()

    person.preview = true
    person._addProfilePicture('link')
    expect(link).toHaveBeenCalledOnce()
  })

  it('leaves media unchanged when either form is cancelled', () => {
    const gallery = makeGallery()
    const action = vi.fn()
    gallery.addEventListener('edit:action', action)
    gallery.openNewMedia()
    gallery._handleMediaRefCancel()
    gallery.openMediaRef()
    gallery._handleMediaRefCancel()
    expect(action).not.toHaveBeenCalled()
    expect(gallery.dialogContent).toBe('')
  })

  it('links existing media with its selected crop', () => {
    const gallery = makeGallery()
    const action = vi.fn()
    gallery.addEventListener('edit:action', action)
    const mediaRef = {ref: 'existing', rect: [10, 20, 80, 90]}
    gallery._handleMediaRefSave(saveEvent(mediaRef))
    expect(action.mock.calls[0][0].detail).toEqual({
      action: 'addMediaRef',
      data: mediaRef,
    })
  })

  it('links newly uploaded media only after successful upload', async () => {
    const gallery = makeGallery()
    const form = document.createElement('grampsjs-form-new-media')
    let resolveUpload
    form.upload = vi.fn(
      () =>
        new Promise(resolve => {
          resolveUpload = resolve
        })
    )
    gallery.renderRoot.append(form)
    const action = vi.fn()
    gallery.addEventListener('edit:action', action)
    const submitted = {desc: 'Portrait'}
    gallery._handleNewMediaSave(saveEvent(submitted))
    expect(form.upload).toHaveBeenCalledWith(submitted)
    expect(action).not.toHaveBeenCalled()
    resolveUpload({data: {handle: 'new-picture'}})
    await Promise.resolve()
    expect(action.mock.calls[0][0].detail).toEqual({
      action: 'addMediaRef',
      data: {ref: 'new-picture'},
    })
  })

  it('does not link media if its upload fails', async () => {
    const gallery = makeGallery()
    const form = document.createElement('grampsjs-form-new-media')
    form.upload = vi.fn().mockResolvedValue({error: 'Upload failed'})
    gallery.renderRoot.append(form)
    const action = vi.fn()
    gallery.addEventListener('edit:action', action)
    gallery._handleNewMediaSave(saveEvent({desc: 'Portrait'}))
    await Promise.resolve()
    expect(action).not.toHaveBeenCalled()
  })
})
