import {describe, it, expect, afterEach, vi} from 'vitest'

import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'

class TestViewObject extends GrampsjsViewObject {
  getUrl() {
    return `/api/people/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }`
  }
}

if (!window.customElements.get('test-view-object-lang')) {
  window.customElements.define('test-view-object-lang', TestViewObject)
}

// Each apiGet call returns a promise that the test resolves by hand, so the
// order in which the responses arrive can be controlled.
function makeAppState(lang = '') {
  const pending = []
  return {
    i18n: {strings: {}, lang},
    permissions: {},
    dbInfo: {},
    settings: {},
    apiGet: vi.fn(
      url =>
        new Promise(resolve => {
          pending.push({url, resolve})
        })
    ),
    pending,
  }
}

function makeView(appState) {
  const view = document.createElement('test-view-object-lang')
  view.appState = appState
  view.grampsId = 'I0001'
  view.active = true
  document.body.appendChild(view)
  return view
}

describe('object view: data requests around the language change', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sends one request on the first appState assignment', async () => {
    const appState = makeAppState('')
    const view = makeView(appState)
    await view.updateComplete

    expect(appState.apiGet).toHaveBeenCalledTimes(1)
    expect(appState.apiGet).toHaveBeenCalledWith(
      '/api/people/?gramps_id=I0001&locale=en'
    )
  })

  it('requests the data again when the language changes', async () => {
    const appState = makeAppState('')
    const view = makeView(appState)
    await view.updateComplete

    view.appState = {...appState, i18n: {strings: {}, lang: 'de'}}
    await view.updateComplete

    expect(appState.apiGet).toHaveBeenCalledTimes(2)
    expect(appState.apiGet).toHaveBeenLastCalledWith(
      '/api/people/?gramps_id=I0001&locale=de'
    )
  })

  it('does not request the data again when only the strings change', async () => {
    const appState = makeAppState('de')
    const view = makeView(appState)
    await view.updateComplete

    view.appState = {
      ...appState,
      i18n: {strings: {Birth: 'Geburt'}, lang: 'de'},
    }
    await view.updateComplete

    expect(appState.apiGet).toHaveBeenCalledTimes(1)
  })

  it('ignores a response of an earlier request that arrives late', async () => {
    const appState = makeAppState('')
    const view = makeView(appState)
    await view.updateComplete

    view.appState = {...appState, i18n: {strings: {}, lang: 'de'}}
    await view.updateComplete
    expect(appState.pending).toHaveLength(2)

    const [first, second] = appState.pending
    second.resolve({data: [{gramps_id: 'I0001', lang: 'de'}]})
    await view.updateComplete
    first.resolve({data: [{gramps_id: 'I0001', lang: 'en'}]})
    await view.updateComplete
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })

    expect(view._data).toEqual({gramps_id: 'I0001', lang: 'de'})
    expect(view.loading).toBe(false)
  })

  it('applies the response of the latest request when it arrives last', async () => {
    const appState = makeAppState('')
    const view = makeView(appState)
    await view.updateComplete

    view.appState = {...appState, i18n: {strings: {}, lang: 'de'}}
    await view.updateComplete

    const [first, second] = appState.pending
    first.resolve({data: [{gramps_id: 'I0001', lang: 'en'}]})
    await view.updateComplete
    second.resolve({data: [{gramps_id: 'I0001', lang: 'de'}]})
    await view.updateComplete
    await new Promise(resolve => {
      setTimeout(resolve, 0)
    })

    expect(view._data).toEqual({gramps_id: 'I0001', lang: 'de'})
    expect(view.loading).toBe(false)
  })
})
