import {describe, it, expect} from 'vitest'
import {GrampsjsEditableList} from '../../src/components/GrampsjsEditableList.js'
import {moveTo} from '../../src/util.js'

class TestEditableList extends GrampsjsEditableList {
  constructor() {
    super()
    this.moves = []
  }

  _handleMove(from, to) {
    this.moves.push([from, to])
  }
}
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

describe('moveTo', () => {
  it('moves an element down', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 0, 2)).to.deep.equal([
      'b',
      'c',
      'a',
      'd',
    ])
  })

  it('moves an element up', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 3, 1)).to.deep.equal([
      'a',
      'd',
      'b',
      'c',
    ])
  })

  it('leaves the array unchanged for indices out of range', () => {
    const array = ['a', 'b']
    expect(moveTo(array, -1, 0)).to.equal(array)
    expect(moveTo(array, 0, 2)).to.equal(array)
    expect(moveTo(array, 1, 1)).to.equal(array)
  })
})

describe('moving items', () => {
  it('moves the selected item with the arrow buttons', () => {
    const list = makeList([A, B, C], 1)
    list._handleUp()
    expect(list.moves).to.deep.equal([[1, 0]])
    list._selectedIndex = 1
    list._handleDown()
    expect(list.moves).to.deep.equal([
      [1, 0],
      [1, 2],
    ])
  })

  it('does not move past either end or without a selection', () => {
    makeList([A, B, C], 0)._handleUp()
    const list = makeList([A, B, C], 2)
    list._handleDown()
    expect(list.moves).to.deep.equal([])
    const unselected = makeList([A, B, C], -1)
    unselected._handleDown()
    expect(unselected.moves).to.deep.equal([])
  })

  it('fires a move of the list property by default', () => {
    const list = new TestEditableList()
    list.listProp = 'urls'
    const details = []
    list.addEventListener('edit:action', e => details.push(e.detail))
    GrampsjsEditableList.prototype._handleMove.call(list, 2, 0)
    expect(details).to.deep.equal([
      {action: 'moveListItem', prop: 'urls', index: 2, to: 0},
    ])
  })

  it('moves an item by more than one position', () => {
    const list = makeList([A, B, C], -1)
    list._moveItem(0, 2)
    expect(list.moves).to.deep.equal([[0, 2]])
    reload(list, [B, C, A])
    expect(list._selectedIndex).to.equal(2)
  })
})

describe('selection after reordering', () => {
  it('keeps the item selected after moving it down', () => {
    const list = makeList([A, B, C], 0)
    list._handleDown()
    expect(list._selectedIndex).to.equal(-1)
    reload(list, [B, A, C])
    expect(list._selectedIndex).to.equal(1)
  })

  it('keeps the item selected after moving it up', () => {
    const list = makeList([A, B, C], 2)
    list._handleUp()
    reload(list, [A, C, B])
    expect(list._selectedIndex).to.equal(1)
  })

  it('selects nothing when the data comes back unchanged', () => {
    const list = makeList([A, B, C], 0)
    list._handleDown()
    reload(list, [A, B, C])
    expect(list._selectedIndex).to.equal(-1)
    expect(list._pendingSelection).to.equal(null)
  })

  it('forgets a failed move at the next data change', () => {
    const list = makeList([A, B, C], 0)
    list._handleDown()
    // the move failed, so no data arrives; the user selects another item
    list._selectedIndex = 2
    reload(list, [A, B, C, {ref: 'd', role: 'Primary'}])
    expect(list._selectedIndex).to.equal(2)
    expect(list._pendingSelection).to.equal(null)
  })

  it('drops the pending selection when leaving edit mode', () => {
    const list = makeList([A, B, C], 0)
    list._handleDown()
    list.updated(new Map([['edit', true]]))
    reload(list, [B, A, C])
    expect(list._selectedIndex).to.equal(-1)
  })
})
