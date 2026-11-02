import {describe, it, expect, vi, beforeEach} from 'vitest'
import {getDraft, saveDraft, clearDraft} from '../../src/api.js'
import '../../src/components/GrampsjsEditor.js'

vi.mock('../../src/api.js', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
  }
})

const GrampsjsEditor = customElements.get('grampsjs-editor')

const text = string => ({_class: 'StyledText', string, tags: []})

function editor(initialData) {
  const ed = new GrampsjsEditor()
  ed.id = 'task-note-editor'
  ed.appState = {path: {page: 'task', pageId: 'T0001'}}
  ed.initialData = initialData
  return ed
}

beforeEach(() => {
  getDraft.mockReset()
  saveDraft.mockReset()
  clearDraft.mockReset()
})

describe('_restoreDraft', () => {
  it('shows the initial data when the draft equals it', () => {
    const saved = text('Edit one')
    getDraft.mockReturnValue({data: text('Edit one'), base: text('Original')})
    const ed = editor(saved)
    ed._restoreDraft()
    expect(ed.data).toEqual(saved)
    expect(clearDraft).toHaveBeenCalledWith('task:T0001:task-note-editor')
  })

  it('restores a draft started from the initial data', () => {
    const draft = text('Unsaved')
    getDraft.mockReturnValue({data: draft, base: text('Original')})
    const ed = editor(text('Original'))
    ed._restoreDraft()
    expect(ed.data).toEqual(draft)
    expect(ed._showDraftBanner).toBe(true)
    expect(clearDraft).not.toHaveBeenCalled()
  })

  it('discards a draft whose base text has changed since', () => {
    const current = text('Changed elsewhere')
    getDraft.mockReturnValue({data: text('Unsaved'), base: text('Original')})
    const ed = editor(current)
    ed._restoreDraft()
    expect(ed.data).toEqual(current)
    expect(clearDraft).toHaveBeenCalled()
  })

  it('restores a draft stored without a base', () => {
    const draft = text('Unsaved')
    getDraft.mockReturnValue({data: draft})
    const ed = editor(text('Original'))
    ed._restoreDraft()
    expect(ed.data).toEqual(draft)
  })

  it('shows the initial data when there is no draft', () => {
    const initial = text('Original')
    getDraft.mockReturnValue(null)
    const ed = editor(initial)
    ed._restoreDraft()
    expect(ed.data).toEqual(initial)
    expect(clearDraft).not.toHaveBeenCalled()
  })
})

describe('discardDraft', () => {
  it('cancels the pending save and clears the stored draft', () => {
    vi.useFakeTimers()
    const ed = editor(text('Original'))
    ed.data = text('Unsaved')
    ed._saveDraftDebounced()
    ed.discardDraft()
    vi.runAllTimers()
    vi.useRealTimers()
    expect(saveDraft).not.toHaveBeenCalled()
    expect(clearDraft).toHaveBeenCalledWith('task:T0001:task-note-editor')
  })

  it('stores the initial data as the base of a draft', () => {
    const initial = text('Original')
    const ed = editor(initial)
    ed.data = text('Unsaved')
    ed._saveDraftNow()
    expect(saveDraft).toHaveBeenCalledWith(
      'task:T0001:task-note-editor',
      ed.data,
      initial
    )
  })
})
