import {describe, it, expect} from 'vitest'
import {GrampsjsEditableList} from '../../src/components/GrampsjsEditableList.js'

class TestEditableList extends GrampsjsEditableList {}
customElements.define('test-editable-list', TestEditableList)

const A = {ref: 'a', role: 'Birth'}
const B = {ref: 'b', role: 'Primary'}
const C = {ref: 'c', role: 'Primary'}

// a list with `data`, `selected` selected, as after a click on that row
function makeList(data, selected) {
  const list = new TestEditableList()
  list.data = data
  list._selectedIndex = selected
  return list
}

// what the parent passes in after reloading the object: new item objects
function reload(list, data) {
  list.data = structuredClone(data)
  list.updated(new Map([['data', undefined]]))
}

describe('selection after reordering', () => {
  it('keeps the item selected after moving it down', () => {
    const list = makeList([A, B, C], 0)
    list._updateSelectionAfterReorder(false)
    expect(list._selectedIndex).to.equal(-1)
    reload(list, [B, A, C])
    expect(list._selectedIndex).to.equal(1)
  })

  it('keeps the item selected after moving it up', () => {
    const list = makeList([A, B, C], 2)
    list._updateSelectionAfterReorder(true)
    reload(list, [A, C, B])
    expect(list._selectedIndex).to.equal(1)
  })

  it('selects nothing when the data comes back unchanged', () => {
    const list = makeList([A, B, C], 0)
    list._updateSelectionAfterReorder(false)
    reload(list, [A, B, C])
    expect(list._selectedIndex).to.equal(-1)
    expect(list._pendingSelection).to.equal(null)
  })

  it('forgets a failed move at the next data change', () => {
    const list = makeList([A, B, C], 0)
    list._updateSelectionAfterReorder(false)
    // the move failed, so no data arrives; the user selects another item
    list._selectedIndex = 2
    reload(list, [A, B, C, {ref: 'd', role: 'Primary'}])
    expect(list._selectedIndex).to.equal(2)
    expect(list._pendingSelection).to.equal(null)
  })

  it('remembers nothing without a selection', () => {
    const list = makeList([A, B, C], -1)
    list._updateSelectionAfterReorder(false)
    expect(list._pendingSelection).to.equal(null)
  })

  it('drops the pending selection when leaving edit mode', () => {
    const list = makeList([A, B, C], 0)
    list._updateSelectionAfterReorder(false)
    list.updated(new Map([['edit', true]]))
    reload(list, [B, A, C])
    expect(list._selectedIndex).to.equal(-1)
  })
})
