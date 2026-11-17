import {describe, it, expect, vi} from 'vitest'
import {
  isInModalDialog,
  showAboveModalDialog,
} from '../../src/components/GrampsjsTooltip.js'

// A <dialog>, modal or not, as seen by isInModalDialog
const dialog = modal => ({
  localName: 'dialog',
  matches: selector => selector === ':modal' && modal,
  parentNode: null,
})

// A button in a component's shadow root, slotted into a dialog's shadow root:
// button -> shadow root -> host -> slotted form -> slot -> dialog
const nestedIn = target => {
  const slot = {localName: 'slot', parentNode: target}
  const form = {localName: 'form', assignedSlot: slot, parentNode: {}}
  const host = {localName: 'grampsjs-report', parentNode: form}
  const shadowRoot = {parentNode: null, host}
  return {localName: 'md-icon-button', parentNode: shadowRoot}
}

describe('isInModalDialog', () => {
  it('follows shadow roots and slots up to a modal dialog', () => {
    expect(isInModalDialog(nestedIn(dialog(true)))).toBe(true)
  })

  it('ignores a dialog that is not modal', () => {
    expect(isInModalDialog(nestedIn(dialog(false)))).toBe(false)
  })

  it('is false outside dialogs', () => {
    expect(isInModalDialog(nestedIn({localName: 'body'}))).toBe(false)
  })
})

describe('showAboveModalDialog', () => {
  const makeInstance = inDialog => {
    const calls = []
    const popper = document.createElement('div')
    popper.showPopover = vi.fn(() => calls.push('showPopover'))
    const popperInstance = {
      setOptions: vi.fn(action => {
        calls.push(['setOptions', action({placement: 'top'})])
      }),
      forceUpdate: vi.fn(() => calls.push('forceUpdate')),
    }
    const reference = nestedIn(inDialog ? dialog(true) : {localName: 'body'})
    return {instance: {popper, reference, popperInstance}, calls}
  }

  it('leaves tooltips outside modal dialogs alone', () => {
    const {instance, calls} = makeInstance(false)
    showAboveModalDialog(instance)
    expect(calls).toEqual([])
    expect(instance.popper.hasAttribute('popover')).toBe(false)
  })

  it('opens a popover in a modal dialog and positions it afterwards', () => {
    const {instance, calls} = makeInstance(true)
    showAboveModalDialog(instance)
    expect(instance.popper.getAttribute('popover')).toBe('manual')
    expect(calls).toEqual([
      ['setOptions', {placement: 'top', strategy: 'fixed'}],
      'showPopover',
      'forceUpdate',
    ])
  })
})
