import {describe, it, expect, vi} from 'vitest'
import {GrampsJs} from '../../src/GrampsJs.js'
import {GrampsjsViewAdminSettings} from '../../src/views/GrampsjsViewAdminSettings.js'

function makeElement(search) {
  const element = Object.create(GrampsJs.prototype)
  element.appState = {
    dbInfo: {search, object_counts: {people: 10}},
    loadActiveTasks: vi.fn(),
  }
  element._loadDbInfo = vi.fn()
  return element
}

const taskDone = taskName => ({detail: {taskId: 't1', status: {taskName}}})

describe('search index check', () => {
  it('asks for a rebuild when the index is empty', () => {
    const element = makeElement({sifts: {version: '3.24.0', count: 0}})
    element._checkSearch()
    expect(element._reindexNeeded).toBe(true)
    expect(element._searchIndexBuilding).toBe(false)
    expect(element.appState.loadActiveTasks).not.toHaveBeenCalled()
  })

  it('does not ask for a rebuild while the API builds the index', () => {
    const element = makeElement({
      sifts: {version: '3.25.0', count: 0},
      building: true,
    })
    element._checkSearch()
    expect(element._reindexNeeded).toBe(false)
    expect(element._searchIndexBuilding).toBe(true)
  })

  it('loads the active tasks so the build shows its progress', () => {
    const element = makeElement({
      sifts: {version: '3.25.0', count: 0},
      building: true,
    })
    element._checkSearch()
    expect(element.appState.loadActiveTasks).toHaveBeenCalled()
  })

  it('reloads the metadata once the build task has finished', () => {
    const element = makeElement({
      sifts: {version: '3.25.0', count: 0},
      building: true,
    })
    element._checkSearch()
    element._handleTaskDone(taskDone('importFile'))
    expect(element._loadDbInfo).not.toHaveBeenCalled()
    element._handleTaskDone(taskDone('searchReindexFull'))
    expect(element._loadDbInfo).toHaveBeenCalledWith(false)
  })

  it('ignores search index tasks while no build is reported', () => {
    const element = makeElement({sifts: {version: '3.25.0', count: 10}})
    element._checkSearch()
    element._handleTaskDone(taskDone('searchReindexFull'))
    expect(element._loadDbInfo).not.toHaveBeenCalled()
  })
})

describe('admin settings search index build', () => {
  const running = tasks =>
    GrampsjsViewAdminSettings.prototype._searchReindexRunning.call({
      appState: {getActiveTasks: () => tasks},
    })

  it('reports a running build of the search index', () => {
    expect(running([{taskName: 'searchReindexFull', state: 'STARTED'}])).toBe(
      true
    )
  })

  it('ignores finished builds and other tasks', () => {
    expect(
      running([
        {taskName: 'searchReindexFull', state: 'SUCCESS'},
        {taskName: 'importFile', state: 'STARTED'},
      ])
    ).toBe(false)
  })
})
