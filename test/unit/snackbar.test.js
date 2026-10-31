import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {SNACKBAR_TIMEOUT} from '../../src/components/GrampsjsSnackbar.js'
import {UNDO_TIMEOUT} from '../../src/components/GrampsjsUndoTransaction.js'

const makeSnackbar = () => {
  const element = document.createElement('grampsjs-snackbar')
  element.appState = {i18n: {strings: {}}}
  return element
}

const shown = snackbar => snackbar._current?.message ?? null

describe('snackbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides a message after its timeout', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Saved'})
    expect(shown(snackbar)).toBe('Saved')
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT)
    expect(shown(snackbar)).toBe(null)
  })

  it('replaces a message without action', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'First'})
    snackbar.show({message: 'Second'})
    expect(shown(snackbar)).toBe('Second')
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT)
    expect(shown(snackbar)).toBe(null)
  })

  it('replaces a message with action', () => {
    const snackbar = makeSnackbar()
    const action = {label: 'Details', handler: () => {}}
    snackbar.show({message: 'Error', action})
    snackbar.show({message: 'Saved'})
    expect(shown(snackbar)).toBe('Saved')
  })

  it('queues new messages behind a message to keep', () => {
    const snackbar = makeSnackbar()
    const action = {label: 'Undo', handler: () => {}}
    snackbar.show({message: 'Deleted', action, keep: true})
    snackbar.show({message: 'Saved'})
    expect(shown(snackbar)).toBe('Deleted')
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT)
    expect(shown(snackbar)).toBe('Saved')
  })

  it('shows only the last of several messages waiting behind one to keep', () => {
    const snackbar = makeSnackbar()
    const action = {label: 'Undo', handler: () => {}}
    snackbar.show({message: 'Deleted', action, keep: true})
    snackbar.show({message: 'First'})
    snackbar.show({message: 'Second'})
    snackbar.dismiss()
    expect(shown(snackbar)).toBe('Second')
  })

  it('skips a message that is already shown or queued', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Not found'})
    snackbar.show({message: 'Not found'})
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT)
    expect(shown(snackbar)).toBe(null)
  })

  it('keeps a message without timeout until it is dismissed', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Update', timeout: 0})
    vi.advanceTimersByTime(60000)
    expect(shown(snackbar)).toBe('Update')
    snackbar.dismiss()
    expect(shown(snackbar)).toBe(null)
  })

  it('shows timed messages before a message without timeout', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Update', timeout: 0})
    snackbar.show({message: 'Saved'})
    expect(shown(snackbar)).toBe('Saved')
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT)
    expect(shown(snackbar)).toBe('Update')
  })

  it('brings back a message without timeout after a timed one is dismissed', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Update', timeout: 0})
    snackbar.show({message: 'Saved', dismissible: true})
    snackbar.dismiss()
    expect(shown(snackbar)).toBe('Update')
  })

  it('runs the action and hides the message', () => {
    const snackbar = makeSnackbar()
    const handler = vi.fn()
    snackbar.show({message: 'Deleted', action: {label: 'Undo', handler}})
    snackbar._handleAction()
    expect(handler).toHaveBeenCalledOnce()
    expect(shown(snackbar)).toBe(null)
  })

  it('keeps the message while paused and hides it after resuming', () => {
    const snackbar = makeSnackbar()
    snackbar.show({message: 'Saved'})
    vi.advanceTimersByTime(SNACKBAR_TIMEOUT - 2000)
    snackbar._pause()
    vi.advanceTimersByTime(60000)
    expect(shown(snackbar)).toBe('Saved')
    snackbar._resume()
    vi.advanceTimersByTime(1999)
    expect(shown(snackbar)).toBe('Saved')
    vi.advanceTimersByTime(1)
    expect(shown(snackbar)).toBe(null)
  })
})

describe('undo transaction', () => {
  it('offers to undo in the snackbar', () => {
    const undo = document.createElement('grampsjs-undo-transaction')
    undo.appState = {i18n: {strings: {}}, apiPost: vi.fn(async () => ({}))}
    const notifications = []
    undo.addEventListener('grampsjs:notification', e =>
      notifications.push(e.detail)
    )
    undo._handleEvent({detail: {message: 'Deleted', transaction: [{a: 1}]}})
    expect(notifications).toHaveLength(1)
    const [detail] = notifications
    expect(detail.message).toBe('Deleted')
    expect(detail.action.label).toBe('Undo')
    expect(detail.timeout).toBe(UNDO_TIMEOUT)
    expect(detail.dismissible).toBe(true)
    expect(detail.keep).toBe(true)
    detail.action.handler()
    expect(undo.appState.apiPost).toHaveBeenCalledWith(
      '/api/transactions/?undo=1',
      [{a: 1}]
    )
  })
})
