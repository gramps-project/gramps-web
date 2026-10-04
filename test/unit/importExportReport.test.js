import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsImportExportReport.js'
import '../../src/components/GrampsjsImportCounts.js'
import {GrampsjsImport} from '../../src/components/GrampsjsImport.js'
import {GrampsjsViewExport} from '../../src/views/GrampsjsViewExport.js'
import {awaitTaskResponse} from '../../src/taskResponse.js'
import {fireEvent, getTaskResult} from '../../src/util.js'

const mounted = []

async function mount(tag, props) {
  const el = document.createElement(tag)
  Object.assign(el, props)
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const makeProgress = id => {
  const prog = document.createElement('div')
  prog.id = id
  Object.assign(prog, {
    reset: vi.fn(),
    setComplete: vi.fn(),
    setError: vi.fn(),
  })
  return prog
}

describe('grampsjs-import-export-report', () => {
  it('renders nothing without messages', async () => {
    const el = await mount('grampsjs-import-export-report', {messages: []})
    expect(el.shadowRoot.querySelector('.messages')).toBeNull()
  })

  it('renders a single multi-line message verbatim', async () => {
    const el = await mount('grampsjs-import-export-report', {
      messages: ['Summary\nLine 1\nLine 2'],
      heading: 'Heading',
    })
    expect(el.shadowRoot.querySelector('h4').textContent).toBe('Heading')
    expect(el.shadowRoot.querySelector('.messages').textContent).toBe(
      'Summary\nLine 1\nLine 2'
    )
  })

  it('joins several messages with newlines', async () => {
    const el = await mount('grampsjs-import-export-report', {
      messages: ['a', 'b'],
    })
    expect(el.shadowRoot.querySelector('.messages').textContent).toBe('a\nb')
  })

  it('moves padded GEDCOM source lines to their own line', async () => {
    const el = await mount('grampsjs-import-export-report', {
      messages: [
        'GEDCOM import report: 1 errors detected\nCould not import a.jpg               Line   144: 1 FILE a.jpg',
      ],
    })
    expect(el.shadowRoot.querySelector('.messages').textContent).toBe(
      'GEDCOM import report: 1 errors detected\nCould not import a.jpg\n    Line   144: 1 FILE a.jpg'
    )
  })

  it('renders as a warning alert with warn', async () => {
    const el = await mount('grampsjs-import-export-report', {
      messages: ['a'],
      warn: true,
    })
    expect(el.shadowRoot.querySelector('.alert.warn')).not.toBeNull()
    expect(el.shadowRoot.querySelector('.card')).toBeNull()
  })
})

describe('grampsjs-import-counts', () => {
  it('lists only non-zero counts', async () => {
    const el = await mount('grampsjs-import-counts', {
      counts: {people: 12, families: 0, messages: ['x']},
    })
    expect(el.shadowRoot.querySelectorAll('tbody tr').length).toBe(1)
  })

  it('renders nothing when all counts are zero', async () => {
    const el = await mount('grampsjs-import-counts', {counts: {people: 0}})
    expect(el.shadowRoot.querySelector('table')).toBeNull()
  })
})

describe('getTaskResult', () => {
  it('prefers result_object', () => {
    expect(
      getTaskResult({result_object: {url: 'a'}, result: '{"url":"b"}'})
    ).toEqual({url: 'a'})
  })

  it('falls back to the result JSON string', () => {
    expect(getTaskResult({result: '{"url":"b"}'})).toEqual({url: 'b'})
  })

  it('returns an empty object for missing or invalid results', () => {
    expect(getTaskResult(undefined)).toEqual({})
    expect(getTaskResult({result: 'not json'})).toEqual({})
  })
})

// appState reports a finished task on window, with the task id.
const finishTask = (taskId, status) =>
  fireEvent(
    window,
    status.state === 'SUCCESS' ? 'task:complete' : 'task:error',
    {
      taskId,
      status,
    }
  )

describe('awaitTaskResponse', () => {
  const appState = () => ({registerTask: vi.fn()})
  const opts = prog => ({prog, label: 'Export', taskName: 'exportFile'})

  it('returns an immediate result', async () => {
    const prog = makeProgress('p')

    const outcome = await awaitTaskResponse(
      appState(),
      {data: {url: '/u'}},
      opts(prog)
    )

    expect(outcome).toEqual({data: {url: '/u'}})
    expect(prog.setComplete).toHaveBeenCalled()
  })

  it('returns an error response', async () => {
    const prog = makeProgress('p')

    const outcome = await awaitTaskResponse(
      appState(),
      {error: 'nope'},
      opts(prog)
    )

    expect(outcome).toEqual({error: 'nope'})
    expect(prog.setError).toHaveBeenCalled()
  })

  it('registers a queued task and returns its result', async () => {
    const prog = makeProgress('p')
    const state = appState()

    const pending = awaitTaskResponse(state, {task: {id: 't1'}}, opts(prog))
    finishTask('other', {state: 'SUCCESS', result_object: {url: '/x'}})
    fireEvent(window, 'task:complete', {status: {state: 'SUCCESS'}})
    finishTask('t1', {state: 'SUCCESS', result_object: {url: '/u'}})

    expect(await pending).toEqual({data: {url: '/u'}})
    expect(state.registerTask).toHaveBeenCalledWith('t1', 'Export', {
      taskName: 'exportFile',
    })
    expect(prog.taskId).toBe('t1')
  })

  it('returns the error of a failed task', async () => {
    const pending = awaitTaskResponse(
      appState(),
      {task: {id: 't1'}},
      opts(makeProgress('p'))
    )
    finishTask('t1', {state: 'FAILURE', info: 'boom'})

    expect(await pending).toEqual({error: 'boom'})
  })
})

describe('export view: report messages', () => {
  const makeExport = apiPost => {
    const element = new GrampsjsViewExport()
    const root = element.createRenderRoot()
    root.append(makeProgress('indicator-export'))
    element.renderRoot = root
    element.appState = {apiPost, registerTask: vi.fn(), i18n: {strings: {}}}
    return element
  }

  it('keeps messages from a synchronous export', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {url: '/api/exporters/ged/file/processed/x.ged', messages: ['m']},
    })
    const element = makeExport(apiPost)

    await element._generateExport()

    expect(element._messages).toEqual(['m'])
    expect(element._downloadUrl).toBe('/api/exporters/ged/file/processed/x.ged')
  })

  it('keeps messages from a finished export task', async () => {
    const apiPost = vi.fn().mockResolvedValue({task: {id: 't1'}})
    const element = makeExport(apiPost)

    const pending = element._generateExport()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    finishTask('t1', {
      state: 'SUCCESS',
      result_object: {url: '/u', messages: ['a', 'b']},
    })
    await pending

    expect(element._messages).toEqual(['a', 'b'])
    expect(element._downloadUrl).toBe('/u')
  })

  it('clears messages when a new export starts', async () => {
    const apiPost = vi.fn().mockResolvedValue({error: 'nope'})
    const element = makeExport(apiPost)
    element._messages = ['old']

    await element._generateExport()

    expect(element._messages).toEqual([])
  })

  it('clears messages when another exporter is selected', () => {
    const element = makeExport(vi.fn())
    element._messages = ['old']

    element._handleSelect({target: {value: 'gramps'}})

    expect(element._messages).toEqual([])
  })
})

describe('import: preview, confirmation and result', () => {
  const fileA = new File(['0 HEAD'], 'a.ged')
  const fileB = new File(['0 HEAD'], 'b.ged')
  const preview = {people: 2, messages: ['line 1\nline 2']}
  const imported = {people: 2, messages: ['done']}

  const makeImport = ({apiPost, confirmed = true}) => {
    const element = new GrampsjsImport()
    const root = element.createRenderRoot()
    const dialog = document.createElement('grampsjs-import-preview-dialog')
    dialog.confirm = vi.fn().mockResolvedValue(confirmed)
    const upload = document.createElement('div')
    upload.id = 'upload-tree'
    upload.file = fileA
    upload.reset = vi.fn(() => {
      upload.file = undefined
    })
    root.append(makeProgress('progress-tree'), dialog, upload)
    element.renderRoot = root
    element.appState = {apiPost, registerTask: vi.fn(), i18n: {strings: {}}}
    element.refreshes = 0
    element.addEventListener('db:changed', () => {
      element.refreshes += 1
    })
    element._handleUploadChanged()
    return {element, dialog, upload}
  }

  // apiPost answering the preview and then the import.
  const answers = (...responses) => {
    const apiPost = vi.fn()
    responses.forEach(r => apiPost.mockResolvedValueOnce(r))
    return apiPost
  }

  it('previews, confirms and imports the selected file', async () => {
    const apiPost = answers({data: preview}, {data: imported})
    const {element, dialog, upload} = makeImport({apiPost})

    await element._submit()

    expect(apiPost.mock.calls.map(c => [c[0], c[1]])).toEqual([
      ['/api/importers/ged/file?dry_run=true', fileA],
      ['/api/importers/ged/file', fileA],
    ])
    expect(dialog.confirm).toHaveBeenCalledWith(preview)
    expect(element._importResult).toEqual(imported)
    expect(element.refreshes).toBe(1)
    expect(upload.reset).toHaveBeenCalled()
    expect(element._busy).toBe(false)
  })

  it('stops without importing when the preview is cancelled', async () => {
    const apiPost = answers({data: preview})
    const {element} = makeImport({apiPost, confirmed: false})

    await element._submit()

    expect(apiPost).toHaveBeenCalledTimes(1)
    expect(element._importResult).toBeNull()
    expect(element.refreshes).toBe(0)
    expect(element._busy).toBe(false)
    expect(element._file).toBe(fileA)
  })

  it('handles a preview and an import that run as tasks', async () => {
    const apiPost = answers({task: {id: 'p1'}}, {task: {id: 'i1'}})
    const {element, dialog} = makeImport({apiPost})
    const {registerTask} = element.appState

    const pending = element._submit()
    await vi.waitFor(() => expect(registerTask).toHaveBeenCalledTimes(1))
    finishTask('p1', {state: 'SUCCESS', result_object: preview})
    await vi.waitFor(() => expect(registerTask).toHaveBeenCalledTimes(2))
    finishTask('i1', {state: 'SUCCESS', result_object: imported})
    await pending

    expect(dialog.confirm).toHaveBeenCalledWith(preview)
    expect(element._importResult).toEqual(imported)
    expect(element.refreshes).toBe(1)
  })

  it('drops a preview when another file is selected meanwhile', async () => {
    const apiPost = answers({task: {id: 'p1'}})
    const {element, dialog, upload} = makeImport({apiPost})

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    upload.file = fileB
    element._handleUploadChanged()
    finishTask('p1', {state: 'SUCCESS', result_object: preview})
    await pending

    expect(dialog.confirm).not.toHaveBeenCalled()
    expect(element._file).toBe(fileB)
  })

  it('keeps a newly selected file when an earlier import finishes', async () => {
    const apiPost = answers({data: preview}, {task: {id: 'i1'}})
    const {element, upload} = makeImport({apiPost})

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    upload.file = fileB
    element._handleUploadChanged()
    finishTask('i1', {state: 'SUCCESS', result_object: imported})
    await pending

    expect(element.refreshes).toBe(1)
    expect(element._importResult).toBeNull()
    expect(upload.reset).not.toHaveBeenCalled()
    expect(element._file).toBe(fileB)
  })

  it('accepts a new file while a task never reports back', async () => {
    const apiPost = answers({task: {id: 'p1'}})
    const {element, upload} = makeImport({apiPost})

    element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    expect(element._busy).toBe(true)
    upload.file = fileB
    element._handleUploadChanged()

    expect(element._busy).toBe(false)
    expect(element._file).toBe(fileB)
  })

  it('resets the form when the preview fails', async () => {
    const apiPost = answers({error: 'bad file'})
    const {element, dialog, upload} = makeImport({apiPost})

    await element._submit()

    expect(dialog.confirm).not.toHaveBeenCalled()
    expect(upload.reset).toHaveBeenCalled()
    expect(element._busy).toBe(false)
  })

  it('refreshes for a task it did not start only when idle', () => {
    const {element} = makeImport({apiPost: vi.fn()})

    element._handleOtherTaskComplete()
    element._busy = true
    element._handleOtherTaskComplete()

    expect(element.refreshes).toBe(1)
  })
})
