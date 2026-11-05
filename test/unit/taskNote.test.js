import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import '../../src/views/GrampsjsViewTask.js'
import {GrampsjsViewNewTask} from '../../src/views/GrampsjsViewNewTask.js'

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
      private: false,
    })
  })

  it('adds a private note to a private task', async () => {
    const t = task('New', {notes: []})
    t.source.private = true
    await save.call(t)
    expect(t.saveNote).toHaveBeenCalledWith({
      text: text('New'),
      type: 'To Do',
      tag_list: [],
      private: true,
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
      private: false,
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
      private: false,
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

describe('GrampsjsViewTask handleEditAction', () => {
  const handle = GrampsjsViewTask.prototype.handleEditAction
  let superHandle

  beforeEach(() => {
    superHandle = vi
      .spyOn(
        Object.getPrototypeOf(GrampsjsViewTask.prototype),
        'handleEditAction'
      )
      .mockImplementation(() => {})
  })

  afterEach(() => {
    superHandle.mockRestore()
  })

  // `requests` records the note and task updates in order
  function view(response, note = NOTE, taskSaved = true) {
    const v = {
      requests: [],
      appState: {
        apiPut: vi.fn(async url => {
          v.requests.push(url)
          return response
        }),
      },
      _data: {note_list: [note.handle], extended: {notes: [note]}},
      _className: 'source',
      updateProp: vi.fn(async () => {
        v.requests.push('task')
        return taskSaved
      }),
      _updateData: vi.fn(async () => {}),
      dispatchEvent: vi.fn(),
    }
    return v
  }

  const privacy = isPrivate => ({
    detail: {action: 'updateProp', data: {private: isPrivate}},
  })

  it('makes the note private before the task', async () => {
    const v = view({data: {}})
    await handle.call(v, privacy(true))
    expect(v.appState.apiPut).toHaveBeenCalledWith('/api/notes/n1', {
      ...NOTE,
      private: true,
    })
    expect(v.updateProp).toHaveBeenCalledWith(
      v._data,
      'source',
      {private: true},
      undefined
    )
    expect(v.requests).toEqual(['/api/notes/n1', 'task'])
    expect(superHandle).not.toHaveBeenCalled()
  })

  it('makes the note public after the task and reloads it', async () => {
    const v = view({data: {}}, {...NOTE, private: true})
    await handle.call(v, privacy(false))
    expect(v.requests).toEqual(['task', '/api/notes/n1'])
    expect(v._updateData).toHaveBeenCalledWith(false)
  })

  it('leaves a note alone that already has the privacy', async () => {
    const v = view({data: {}}, {...NOTE, private: true})
    await handle.call(v, privacy(true))
    expect(v.appState.apiPut).not.toHaveBeenCalled()
    expect(superHandle).toHaveBeenCalled()
  })

  it('keeps the task public when the note fails to become private', async () => {
    const v = view({error: 'Server error'})
    await handle.call(v, privacy(true))
    expect(v.updateProp).not.toHaveBeenCalled()
    expect(v.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'grampsjs:error',
        detail: {message: 'Server error'},
      })
    )
  })

  it('keeps the note private when the task fails to become public', async () => {
    const v = view({data: {}}, {...NOTE, private: true}, false)
    await handle.call(v, privacy(false))
    expect(v.requests).toEqual(['task'])
  })

  it('passes other actions on', async () => {
    const v = view({data: {}})
    const e = {detail: {action: 'updateProp', data: {title: 'New'}}}
    await handle.call(v, e)
    expect(v.appState.apiPut).not.toHaveBeenCalled()
    expect(superHandle).toHaveBeenCalledWith(e)
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

describe('GrampsjsViewNewTask _processedData', () => {
  const processedData = GrampsjsViewNewTask.prototype._processedData

  it('gives the note the privacy of the task', () => {
    const data = {
      _class: 'Source',
      attribute_list: [],
      note: {_class: 'Note', text: text('Do it')},
    }
    const [privateTask, privateNote] = processedData.call({
      _todoTagHandle: 'todo',
      data: {...data, private: true},
    })
    expect(privateTask.private).toBe(true)
    expect(privateNote.private).toBe(true)

    const [, publicNote] = processedData.call({_todoTagHandle: 'todo', data})
    expect(publicNote.private).toBe(false)
  })
})
