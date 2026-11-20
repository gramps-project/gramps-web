import {describe, it, expect, beforeEach, vi} from 'vitest'

const tree = vi.hoisted(() => ({id: 'tree1'}))

vi.mock('../../src/api.js', () => ({getTreeId: () => tree.id}))

const {deleteSavedFilter, loadSavedFilters, saveFilter} = await import(
  '../../src/savedFilters.js'
)

const rules = {function: 'and', invert: false, rules: [{name: 'HasTag'}]}

beforeEach(() => {
  localStorage.clear()
  tree.id = 'tree1'
})

describe('saved filters', () => {
  it('saves and loads filters by object type, sorted by name', () => {
    saveFilter('people', 'b', rules)
    saveFilter('people', 'a', rules)
    saveFilter('events', 'c', rules)
    expect(loadSavedFilters('people').map(f => f.name)).toEqual(['a', 'b'])
    expect(loadSavedFilters('events')[0]).toMatchObject({
      namespace: 'events',
      name: 'c',
      rules,
    })
  })

  it('replaces a filter of the same type and name', () => {
    const first = saveFilter('people', 'a', rules)
    const other = {...rules, function: 'or'}
    const second = saveFilter('people', 'a', other)
    expect(second.id).toBe(first.id)
    expect(loadSavedFilters('people')).toEqual([second])
  })

  it('deletes filters by id', () => {
    const a = saveFilter('people', 'a', rules)
    const b = saveFilter('people', 'b', rules)
    expect(deleteSavedFilter(a.id)).toBe(true)
    expect(loadSavedFilters('people')).toEqual([b])
  })

  it('keeps the filters of each tree apart', () => {
    saveFilter('people', 'a', rules)
    tree.id = 'tree2'
    expect(loadSavedFilters('people')).toEqual([])
    saveFilter('people', 'b', rules)
    tree.id = 'tree1'
    expect(loadSavedFilters('people').map(f => f.name)).toEqual(['a'])
  })

  it('skips corrupt storage and invalid entries', () => {
    localStorage.setItem('grampsjs_saved_filters', 'not json')
    expect(loadSavedFilters('people')).toEqual([])
    localStorage.setItem(
      'grampsjs_saved_filters',
      JSON.stringify({tree1: [{id: 'x', namespace: 'people'}, null]})
    )
    expect(loadSavedFilters('people')).toEqual([])
    expect(saveFilter('people', 'a', rules)).not.toBe(null)
  })

  it('returns null when storage fails', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(saveFilter('people', 'a', rules)).toBe(null)
    setItem.mockRestore()
  })
})
