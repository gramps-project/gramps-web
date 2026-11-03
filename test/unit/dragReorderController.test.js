import {describe, it, expect} from 'vitest'
import {
  DragReorderController,
  gridShifts,
  listShifts,
} from '../../src/dragReorderController.js'

// a 3 x 2 grid of 100px cells holding five tiles
const grid = [0, 1, 2, 3, 4].map(i => ({
  left: (i % 3) * 100,
  top: Math.floor(i / 3) * 100,
  width: 100,
  height: 100,
}))

// rows of heights 40, 60 and 40
const list = [
  {left: 0, top: 0, width: 300, height: 40},
  {left: 0, top: 40, width: 300, height: 60},
  {left: 0, top: 100, width: 300, height: 40},
]

describe('grid drag', () => {
  it('stays in place for a small movement', () => {
    const {to, shifts} = gridShifts(grid, 0, 20, 30)
    expect(to).to.equal(0)
    expect(shifts).to.deep.equal([
      [20, 30],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ])
  })

  it('moves a tile forward into the next row', () => {
    const {to, shifts} = gridShifts(grid, 0, 100, 100)
    expect(to).to.equal(4)
    // tiles 1 to 4 move back by one cell, wrapping to the previous row
    expect(shifts).to.deep.equal([
      [100, 100],
      [-100, 0],
      [-100, 0],
      [200, -100],
      [-100, 0],
    ])
  })

  it('moves a tile backward', () => {
    const {to, shifts} = gridShifts(grid, 3, 100, -100)
    expect(to).to.equal(1)
    expect(shifts).to.deep.equal([
      [0, 0],
      [100, 0],
      [-200, 100],
      [100, -100],
      [0, 0],
    ])
  })

  it('keeps the dragged tile within the grid', () => {
    const {to, shifts} = gridShifts(grid, 4, 500, 500)
    // the empty last cell is not a target
    expect(to).to.equal(4)
    expect(shifts[4]).to.deep.equal([100, 0])
  })

  it('finds every cell of a row with rounded tile sizes', () => {
    const sizes = [100.328125, 100.328125, 100.34375]
    const row = sizes.map((size, i) => ({
      left: sizes.slice(0, i).reduce((a, b) => a + b, 0),
      top: 0,
      width: size,
      height: size,
    }))
    expect(gridShifts(row, 0, row[2].left, 0).to).to.equal(2)
  })
})

describe('list drag', () => {
  it('moves a row once its edge passes the middle of the next', () => {
    expect(listShifts(list, 0, 30).to).to.equal(0)
    const {to, shifts} = listShifts(list, 0, 31)
    expect(to).to.equal(1)
    expect(shifts).to.deep.equal([
      [0, 31],
      [0, -40],
      [0, 0],
    ])
  })

  it('keeps the dragged row within the list', () => {
    const {to, shifts} = listShifts(list, 0, 500)
    expect(to).to.equal(2)
    expect(shifts[0]).to.deep.equal([0, 100])
  })
})

describe('cancelling a drag', () => {
  it('keeps the release from clicking the item', () => {
    const host = {addController() {}, requestUpdate() {}}
    const controller = new DragReorderController(host, {
      getContainer: () => null,
      getCount: () => 0,
      onMove() {},
    })
    controller._drag = {pointerId: 1, active: true, items: []}
    controller._handleKeyDown(new KeyboardEvent('keydown', {key: 'Escape'}))
    window.dispatchEvent(new PointerEvent('pointerup', {pointerId: 1}))
    const button = document.createElement('button')
    document.body.append(button)
    let clicks = 0
    button.addEventListener('click', () => {
      clicks += 1
    })
    button.click()
    expect(clicks).to.equal(0)
    // only the one click is suppressed
    button.click()
    expect(clicks).to.equal(1)
    button.remove()
  })
})
