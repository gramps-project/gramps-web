import {describe, it, expect} from 'vitest'
import {gridShifts, listShifts} from '../../src/dragReorderController.js'

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
