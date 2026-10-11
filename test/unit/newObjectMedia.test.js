import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsFormNewCitation.js'
import {GrampsjsFormNewSource} from '../../src/components/GrampsjsFormNewSource.js'
import {GrampsjsViewNewCitation} from '../../src/views/GrampsjsViewNewCitation.js'
import {GrampsjsViewNewPerson} from '../../src/views/GrampsjsViewNewPerson.js'

const formDataEvent = (id, detail) => ({
  composedPath: () => [{id}],
  detail,
  preventDefault: () => {},
  stopPropagation: () => {},
})

const makeElement = element => {
  element.createRenderRoot()
  return element
}

describe('new object forms: gallery', () => {
  it('maps selected media to media references in a dialog form', () => {
    const form = makeElement(
      document.createElement('grampsjs-form-new-citation')
    )

    form._handleFormData(
      formDataEvent('object-media-list', {data: ['media-1', 'media-2']})
    )

    expect(form.data.media_list).toEqual([
      {_class: 'MediaRef', ref: 'media-1'},
      {_class: 'MediaRef', ref: 'media-2'},
    ])
  })

  it('maps selected media to media references in a view', () => {
    const view = makeElement(new GrampsjsViewNewCitation())

    view._handleFormData(formDataEvent('object-media-list', {data: ['m']}))

    expect(view.data.media_list).toEqual([{_class: 'MediaRef', ref: 'm'}])
  })

  it('clears the gallery when all media are removed', () => {
    const form = makeElement(new GrampsjsFormNewSource())
    form._handleFormData(formDataEvent('object-media-list', {data: ['m']}))

    form._handleFormData(formDataEvent('object-media-list', {data: []}))

    expect(form.data.media_list).toEqual([])
  })

  it('keeps the gallery on the person, not on birth and death', () => {
    const view = makeElement(new GrampsjsViewNewPerson())
    view.data = {
      _class: 'Person',
      media_list: [{_class: 'MediaRef', ref: 'm'}],
      birth: {place: 'place-1'},
      death: {place: 'place-2'},
    }

    const [person, birth, death] = view._processedData()

    expect(person.media_list).toEqual([{_class: 'MediaRef', ref: 'm'}])
    expect(birth).not.toHaveProperty('media_list')
    expect(death).not.toHaveProperty('media_list')
  })
})
