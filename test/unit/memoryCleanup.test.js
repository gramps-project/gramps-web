import {describe, it, expect, afterEach, vi} from 'vitest'

import {GrampsjsTaskProgressIndicator} from '../../src/components/GrampsjsTaskProgressIndicator.js'
import {GrampsjsFormEditMatch} from '../../src/components/GrampsjsFormEditMatch.js'
import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'

class TestViewObject extends GrampsjsViewObject {
  getUrl() {
    return ''
  }
}

if (!window.customElements.get('test-view-object')) {
  window.customElements.define('test-view-object', TestViewObject)
}

describe('memory cleanup for event-driven components', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('removes the same edit action handler when GrampsjsViewObject disconnects', () => {
    const element = document.createElement('test-view-object')
    const addSpy = vi.spyOn(element, 'addEventListener')
    const removeSpy = vi.spyOn(element, 'removeEventListener')

    element.connectedCallback()
    element.disconnectedCallback()

    expect(addSpy).toHaveBeenCalledWith(
      'edit:action',
      element._boundHandleEditAction
    )
    expect(removeSpy).toHaveBeenCalledWith(
      'edit:action',
      element._boundHandleEditAction
    )
  })

  it('unregisters the global save listener for GrampsjsFormEditMatch', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const element = new GrampsjsFormEditMatch()
    element.appState = {i18n: {strings: {}}, permissions: {}, dbInfo: {}}

    element.connectedCallback()
    element.disconnectedCallback()

    expect(addSpy).toHaveBeenCalledWith(
      'edit-mode:save',
      element._boundHandleSaveButton
    )
    expect(removeSpy).toHaveBeenCalledWith(
      'edit-mode:save',
      element._boundHandleSaveButton
    )
  })

  it('clears the delayed close timer when GrampsjsTaskProgressIndicator disconnects', () => {
    vi.useFakeTimers()
    const element = new GrampsjsTaskProgressIndicator()
    element.open = true
    element.hideAfter = 1

    element.closeAfter()
    element.disconnectedCallback()
    vi.advanceTimersByTime(1000)

    expect(element.open).toBe(true)
    expect(element._closeTimer).toBeNull()
  })
})
