import {describe, it, expect} from 'vitest'
import {menuSelectionHandler} from '../../src/util.js'

const closeMenu = (initiator, reason) => ({detail: {initiator, reason}})

describe('menuSelectionHandler', () => {
  it('selects the item chosen by click, Enter or Space', () => {
    const selected = []
    const handle = menuSelectionHandler(item => selected.push(item))
    handle(closeMenu('a', {kind: 'click-selection'}))
    handle(closeMenu('b', {kind: 'keydown', key: 'Enter'}))
    handle(closeMenu('c', {kind: 'keydown', key: 'Space'}))
    expect(selected).toEqual(['a', 'b', 'c'])
  })

  it('selects nothing when the menu closes with Escape', () => {
    const selected = []
    const handle = menuSelectionHandler(item => selected.push(item))
    handle(closeMenu('a', {kind: 'keydown', key: 'Escape'}))
    expect(selected).toEqual([])
  })
})
