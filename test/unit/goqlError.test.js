import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewObjectsBase} from '../../src/views/GrampsjsViewObjectsBase.js'
import '../../src/components/GrampsjsFilters.js'

function makeView() {
  const view = Object.create(GrampsjsViewObjectsBase.prototype)
  let respond
  view.appState = {
    apiGet: vi.fn(
      () =>
        new Promise(resolve => {
          respond = resolve
        })
    ),
  }
  Object.defineProperty(view, '_fullUrl', {value: '/api/people/'})
  view._clearSelection = vi.fn()
  return {view, respond: data => respond(data)}
}

// a detached filter panel with an applied GOQL expression
function makeFilters() {
  const filters = document.createElement('grampsjs-filters')
  Object.defineProperty(filters, '_goql', {value: 'a == 1'})
  return filters
}

// what Lit does when the view passes a new errorGoql value
function setErrorGoql(filters, value) {
  const old = filters.errorGoql
  filters.errorGoql = value
  if (old !== value) {
    filters.willUpdate(new Map([['errorGoql', old]]))
  }
}

describe('GOQL error state', () => {
  it('resets the view error while a request is running', async () => {
    const {view, respond} = makeView()
    view.error = true
    view._fetchData()
    expect(view.error).toBe(false)
    respond({error: 'unknown field'})
    await Promise.resolve()
    expect(view.error).toBe(true)
  })

  it('hides the error while editing and shows the next failure', () => {
    const filters = makeFilters()
    setErrorGoql(filters, true)
    expect(filters._hasGoqlError).toBe(true)

    filters._hideGoqlError()
    expect(filters._hasGoqlError).toBe(false)

    // the next request fails as well
    setErrorGoql(filters, false)
    setErrorGoql(filters, true)
    expect(filters._hasGoqlError).toBe(true)
  })

  it('shows the error again when the same expression is applied', () => {
    const filters = makeFilters()
    setErrorGoql(filters, true)
    filters._hideGoqlError()
    Object.defineProperty(filters, 'renderRoot', {
      value: {querySelector: () => null},
    })
    filters._applyGoql()
    expect(filters._hasGoqlError).toBe(true)
  })
})
