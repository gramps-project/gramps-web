import {describe, it, expect, vi} from 'vitest'

import {GrampsjsViewMedia} from '../../src/views/GrampsjsViewMedia.js'
import '../../src/components/GrampsjsRectContainer.js'

function deferred() {
  let resolvePromise
  const promise = new Promise(resolve => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

function regionUpdateEvent(oldRect, rect) {
  return {
    detail: {
      objHandle: 'P1',
      objType: 'person',
      mediaHandle: 'M1',
      oldRect,
      rect,
    },
    stopPropagation: vi.fn(),
  }
}

describe('GrampsjsViewMedia region updates', () => {
  it('saves a region update only after the previous one', async () => {
    const view = new GrampsjsViewMedia()
    const first = deferred()
    const calls = []
    view.updateMediaRef = vi.fn((...args) => {
      calls.push(args)
      return calls.length === 1 ? first.promise : Promise.resolve()
    })

    view._handleRegionUpdate(regionUpdateEvent([0, 0, 10, 10], [5, 5, 15, 15]))
    view._handleRegionUpdate(regionUpdateEvent([5, 5, 15, 15], [8, 8, 18, 18]))
    await flushPromises()
    expect(calls).to.have.length(1)

    first.resolve()
    await flushPromises()
    expect(calls).to.deep.equal([
      ['P1', 'person', 'M1', [0, 0, 10, 10], [5, 5, 15, 15]],
      ['P1', 'person', 'M1', [5, 5, 15, 15], [8, 8, 18, 18]],
    ])
  })
})

describe('GrampsjsRectContainer drawing', () => {
  // A container that is never attached to the document; the pointer
  // position is given in percent of the image directly
  function makeContainer() {
    const container = document.createElement('grampsjs-rect-container')
    const events = []
    container.addEventListener('rect:draw', e => events.push(e.detail.rect))
    container._drag = {
      handle: 'draw',
      start: [10, 10],
      rect: null,
      pointerId: 1,
      current: null,
    }
    const moveTo = coords => {
      container._getRelativeCoords = () => coords
      container._handleMove({pointerId: 1})
    }
    return {container, events, moveTo}
  }

  it('clears the drawn region when it shrinks back to zero size', () => {
    const {container, events, moveTo} = makeContainer()
    moveTo([30, 30])
    moveTo([10, 30])
    expect(events).to.deep.equal([[10, 10, 30, 30], null])
    expect(container._drag.current).to.equal(null)
  })

  it('does not fire again while the drawn region stays at zero size', () => {
    const {events, moveTo} = makeContainer()
    moveTo([10, 30])
    moveTo([30, 10])
    expect(events).to.deep.equal([])
  })
})
