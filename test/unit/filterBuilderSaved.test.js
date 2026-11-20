import {describe, it, expect, beforeEach} from 'vitest'
import {GrampsjsFilterBuilder} from '../../src/components/GrampsjsFilterBuilder.js'
import {newCondition, newGroup} from '../../src/filterBuilder.js'
import {loadSavedFilters} from '../../src/savedFilters.js'

const ancestors = {
  rule: 'IsAncestorOf',
  name: 'Ancestors of <person>',
  description: '',
  category: 'Ancestral filters',
  labels: ['ID:', 'Inclusive:'],
  types: [{type: 'id', namespace: 'Person'}, {type: 'boolean'}],
}

// a builder that is never rendered, editing an "or" of two conditions
function makeBuilder() {
  const builder = new GrampsjsFilterBuilder()
  builder.namespace = 'people'
  builder._catalogue = [ancestors]
  const tree = newGroup('or')
  tree.children = [
    newCondition('IsAncestorOf', ['I1', '0']),
    {...newCondition('IsAncestorOf', ['I2', '1']), invert: true},
  ]
  builder._tree = tree
  return builder
}

beforeEach(() => {
  localStorage.clear()
})

describe('GrampsjsFilterBuilder saved filters', () => {
  it('saves the tree and opens it again', () => {
    const builder = makeBuilder()
    builder._saveName = ' Ancestors '
    builder._save()
    const [saved] = loadSavedFilters('people')
    expect(saved.name).toBe('Ancestors')
    expect(builder._savedFilters).toEqual([saved])

    builder._tree = newGroup()
    builder._openSaved(saved)
    expect(builder._tree.function).toBe('or')
    expect(builder._tree.children.map(c => [c.values[0], c.invert])).toEqual([
      ['I1', false],
      ['I2', true],
    ])
    expect(builder._savedName).toBe('Ancestors')
  })

  it('offers the opened filter name when saving again', () => {
    const builder = makeBuilder()
    builder._saveName = 'Ancestors'
    builder._save()
    builder._openSaved(builder._savedFilters[0])
    builder._openSaveForm()
    expect(builder._saveName).toBe('Ancestors')
  })

  it('keeps Apply and Save disabled for missing objects', () => {
    const builder = makeBuilder()
    expect(builder._canApply).toBe(true)
    builder._addMissing('Person', 'I2')
    expect(builder._canApply).toBe(false)
    expect(builder._canSave).toBe(false)
  })

  it('keeps Save disabled for an empty filter', () => {
    const builder = makeBuilder()
    builder._tree = newGroup()
    expect(builder._canApply).toBe(true)
    expect(builder._canSave).toBe(false)
  })

  it('deletes saved filters', () => {
    const builder = makeBuilder()
    builder._saveName = 'Ancestors'
    builder._save()
    builder._openSavedList()
    builder._deleteSaved(builder._savedFilters[0])
    expect(loadSavedFilters('people')).toEqual([])
    expect(builder._panel).toBe('')
    expect(builder._savedName).toBe('')
  })
})
