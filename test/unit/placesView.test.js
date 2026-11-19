import {describe, it, expect} from 'vitest'
import {GrampsjsViewPlaces} from '../../src/views/GrampsjsViewPlaces.js'

function makeView(strings = {}) {
  const view = Object.create(GrampsjsViewPlaces.prototype)
  // a detached instance has no update cycle
  view.requestUpdate = () => {}
  view.appState = {i18n: {strings, lang: 'nl'}}
  return view
}

const row = placeType => ({
  gramps_id: 'P0001',
  name: {value: 'Utrecht'},
  place_type: placeType,
  change: 0,
})

describe('the places list', () => {
  it('shows the place type in the user language', () => {
    const view = makeView({Village: 'Dorp'})
    expect(view._formatRow(row('Village')).type).toBe('Dorp')
  })

  it('shows a custom place type as entered', () => {
    const view = makeView({Village: 'Dorp'})
    expect(view._formatRow(row('Wijk')).type).toBe('Wijk')
  })

  it('leaves the type empty when the place has none', () => {
    const view = makeView()
    expect(view._formatRow(row(undefined)).type).toBe('')
  })
})
