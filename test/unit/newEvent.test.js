import {describe, it, expect} from 'vitest'
import {GrampsjsViewNewEvent} from '../../src/views/GrampsjsViewNewEvent.js'

const formDataEvent = (id, detail) => ({
  composedPath: () => [{id}],
  detail,
})

const makeView = () => {
  const view = new GrampsjsViewNewEvent()
  view.createRenderRoot()
  const posted = []
  view.appState = {
    path: {page: 'new_event', pageId: ''},
    apiPost: async (url, payload) => {
      posted.push(payload)
      return {
        data: [{new: {_class: 'Event', gramps_id: `E000${posted.length}`}}],
      }
    },
  }
  return {view, posted}
}

const date = {
  _class: 'Date',
  dateval: [1, 2, 1900, false],
  modifier: 0,
  quality: 0,
  calendar: 0,
  newyear: 0,
  sortval: 0,
  text: '',
}

describe('new event view', () => {
  it('does not carry fields over to the next event after saving', async () => {
    const {view, posted} = makeView()
    view._handleFormData(
      formDataEvent('event-type', {data: {_class: 'EventType', string: 'X'}})
    )
    view._handleFormData(formDataEvent('description', {data: 'first'}))
    view._handleFormData(formDataEvent('date', {data: date}))
    view._handleFormData(formDataEvent('private', {checked: true}))
    await view._submit()

    view._handleFormData(
      formDataEvent('event-type', {data: {_class: 'EventType', string: 'Y'}})
    )
    await view._submit()

    expect(posted[0]).toMatchObject({
      description: 'first',
      date,
      private: true,
    })
    expect(posted[1]).not.toHaveProperty('description')
    expect(posted[1]).not.toHaveProperty('date')
    expect(posted[1]).not.toHaveProperty('private')
    expect(posted[1].type).toEqual({_class: 'EventType', string: 'Y'})
  })

  it('clears the data when the form is reset', () => {
    const {view} = makeView()
    view._handleFormData(formDataEvent('description', {data: 'draft'}))

    view._reset()

    expect(view.data).toEqual({_class: 'Event'})
  })
})
