import {describe, it, expect, vi} from 'vitest'
import '../../src/views/GrampsjsViewTask.js'

const GrampsjsTask = customElements.get('grampsjs-task')
const GrampsjsViewTask = customElements.get('grampsjs-view-task')

const text = string => ({_class: 'StyledText', string, tags: []})

const NOTE = {_class: 'Note', handle: 'n1', text: text('Old'), type: 'To Do'}

// a task whose note editor holds `string`
function task(string, {notes = [NOTE], saved = true} = {}) {
  const editor = {data: text(string), discardDraft: vi.fn()}
  return {
    editor,
    source: {
      note_list: notes.map(note => note.handle),
      extended: {notes},
    },
    saveNote: vi.fn(async () => saved),
    renderRoot: {querySelector: () => editor},
    _editingNote: true,
    _savingNote: false,
  }
}

describe('GrampsjsTask _handleSaveNote', () => {
  const save = GrampsjsTask.prototype._handleSaveNote

  it('closes the editor and discards the draft once the save succeeded', async () => {
    const t = task('New')
    const pending = save.call(t)
    expect(t._savingNote).toBe(true)
    expect(t._editingNote).toBe(true)
    await pending
    expect(t.saveNote).toHaveBeenCalledWith({
      ...NOTE,
      text: text('New'),
      type: 'To Do',
    })
    expect(t._savingNote).toBe(false)
    expect(t._editingNote).toBe(false)
    expect(t.editor.discardDraft).toHaveBeenCalled()
  })

  it('keeps the editor and the draft when the save failed', async () => {
    const t = task('New', {saved: false})
    await save.call(t)
    expect(t._savingNote).toBe(false)
    expect(t._editingNote).toBe(true)
    expect(t.editor.discardDraft).not.toHaveBeenCalled()
  })

  it('keeps the editor and the draft when the text changed during the save', async () => {
    const t = task('New')
    t.saveNote.mockImplementation(async () => {
      t.editor.data = text('Newer')
      return true
    })
    await save.call(t)
    expect(t._editingNote).toBe(true)
    expect(t.editor.discardDraft).not.toHaveBeenCalled()
  })

  it('adds a note without a handle', async () => {
    const t = task('New', {notes: []})
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({
      text: text('New'),
      type: 'To Do',
      tag_list: [],
    })
  })

  it('adds a note when the only note of the task was deleted', async () => {
    const t = task('New', {notes: []})
    t.source.note_list = ['deleted']
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({
      text: text('New'),
      type: 'To Do',
      tag_list: [],
    })
  })

  it('updates the first note that exists', async () => {
    const t = task('New')
    t.source.note_list = ['deleted', 'n1']
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({
      ...NOTE,
      text: text('New'),
      type: 'To Do',
    })
  })

  it('gives a new note the tags of the task', async () => {
    const t = task('New', {notes: []})
    t.source.tag_list = ['todo', 'urgent']
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({
      text: text('New'),
      type: 'To Do',
      tag_list: ['todo', 'urgent'],
    })
  })

  it('keeps the type of an existing note', async () => {
    const general = {...NOTE, type: 'General'}
    const t = task('New', {notes: [general]})
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({...general, text: text('New')})
  })

  it('closes without saving when a new note is empty', async () => {
    const t = task('  ', {notes: []})
    await save.call(t)
    expect(t.saveNote).not.toHaveBeenCalled()
    expect(t._editingNote).toBe(false)
    expect(t.editor.discardDraft).toHaveBeenCalled()
  })
})

describe('GrampsjsViewTask _saveNote', () => {
  const saveNote = GrampsjsViewTask.prototype._saveNote

  function view(response) {
    return {
      appState: {
        apiPut: vi.fn(async () => response),
        apiPost: vi.fn(async () => response),
      },
      _data: {handle: 's1'},
      _className: 'source',
      _updateData: vi.fn(async () => {}),
      addHandle: vi.fn(async () => true),
      dispatchEvent: vi.fn(),
    }
  }

  it('updates an existing note and reloads the task', async () => {
    const v = view({data: {}})
    expect(await saveNote.call(v, NOTE)).toBe(true)
    expect(v.appState.apiPut).toHaveBeenCalledWith('/api/notes/n1', NOTE)
    expect(v._updateData).toHaveBeenCalledWith(false)
  })

  it('adds a new note to the task', async () => {
    const v = view({data: [{handle: 'n2'}]})
    const data = {text: text('New'), type: 'To Do'}
    expect(await saveNote.call(v, data)).toBe(true)
    expect(v.appState.apiPost).toHaveBeenCalledWith('/api/notes/', data)
    expect(v.addHandle).toHaveBeenCalledWith(
      'n2',
      v._data,
      'source',
      'note_list'
    )
  })

  it('reports an error and resolves to false when the save fails', async () => {
    const v = view({error: 'Server error'})
    expect(await saveNote.call(v, NOTE)).toBe(false)
    expect(v._updateData).not.toHaveBeenCalled()
    expect(v.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:error',
        detail: {message: 'Server error'},
      })
    )
  })
})
