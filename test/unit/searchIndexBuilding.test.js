import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'

function makeElement(search) {
  const element = Object.create(GrampsJs.prototype)
  element.appState = {
    dbInfo: {search, object_counts: {people: 10}},
  }
  element._loadDbInfo = vi.fn()
  element._searchIndexBuildingTimer = null
  return element
}

describe('search index check', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks for a rebuild when the index is empty', () => {
    const element = makeElement({sifts: {version: '3.24.0', count: 0}})
    element._checkSearch()
    expect(element._reindexNeeded).toBe(true)
    expect(element._searchIndexBuilding).toBe(false)
  })

  it('reports an empty index as building while the API builds it', () => {
    const element = makeElement({
      sifts: {version: '3.25.0', count: 0},
      building: true,
    })
    element._checkSearch()
    expect(element._reindexNeeded).toBe(false)
    expect(element._searchIndexBuilding).toBe(true)
  })

  it('reloads the metadata until the build is done', () => {
    const element = makeElement({
      sifts: {version: '3.25.0', count: 0},
      building: true,
    })
    element._checkSearch()
    expect(element._loadDbInfo).not.toHaveBeenCalled()
    vi.advanceTimersByTime(15000)
    expect(element._loadDbInfo).toHaveBeenCalledWith(false)

    element.appState.dbInfo.search = {
      sifts: {version: '3.25.0', count: 10},
      building: false,
    }
    element._checkSearch()
    vi.advanceTimersByTime(60000)
    expect(element._loadDbInfo).toHaveBeenCalledTimes(1)
    expect(element._searchIndexBuilding).toBe(false)
    expect(element._reindexNeeded).toBe(false)
  })
})
