import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsImportExportReport.js'
import '../../src/components/GrampsjsImportCounts.js'
import {GrampsjsImport} from '../../src/components/GrampsjsImport.js'
import {GrampsjsViewExport} from '../../src/views/GrampsjsViewExport.js'
import {GrampsjsImportMedia} from '../../src/components/GrampsjsImportMedia.js'
import '../../src/components/GrampsjsImportPreviewDialog.js'
import {
  awaitTaskResponse,
  dispatchErrorMessage,
  showUploadProgress,
} from '../../src/taskResponse.js'
import {fireEvent, getTaskResult} from '../../src/util.js'

// tippy.js cannot find the tooltip targets in happy-dom
vi.mock('tippy.js', () => ({default: () => ({setContent() {}})}))

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

  it('hides the messages behind a disclosure with collapsed', async () => {
    const el = await mount('grampsjs-import-export-report', {
      messages: ['a'],
      collapsed: true,
    })
    const details = el.shadowRoot.querySelector('details')
    expect(details.open).toBe(false)
    expect(details.querySelector('.messages').textContent).toBe('a')
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

describe('dispatchErrorMessage', () => {
  const locked = {
    error: 'Another task is already running on this tree',
    errorDetail: {
      status: 409,
      response: {
        error: {
          code: 409,
          type: 'task_locked',
          task: {href: '/api/tasks/t9', id: 't9'},
        },
      },
    },
  }

  it('returns other errors unchanged', () => {
    const state = {loadActiveTasks: vi.fn(), i18n: {strings: {}}}
    const res = {error: 'nope', errorDetail: {status: 409, response: {}}}

    expect(dispatchErrorMessage(state, res)).toBe('nope')
    expect(state.loadActiveTasks).not.toHaveBeenCalled()
  })

  it('translates a task lock and loads the blocking task', () => {
    const key =
      'Another task is already running on this tree. Try again once it has finished.'
    const state = {loadActiveTasks: vi.fn(), i18n: {strings: {[key]: 'Busy'}}}

    expect(dispatchErrorMessage(state, locked)).toBe('Busy')
    expect(state.loadActiveTasks).toHaveBeenCalled()
  })

  it('explains proxy errors that carry no message', () => {
    const state = {i18n: {strings: {}}}
    const proxyError = status => ({
      error: `Error ${status}`,
      errorDetail: {status, response: {}},
    })

    expect(dispatchErrorMessage(state, proxyError(413))).toBe(
      'The file is too large for the server to accept.'
    )
    expect(dispatchErrorMessage(state, proxyError(504))).toBe(
      'The server is unavailable or did not respond in time. Try again later.'
    )
  })

  it("keeps the backend's message for proxy statuses", () => {
    const state = {i18n: {strings: {}}}
    const res = {
      error: 'Quota exceeded',
      errorDetail: {
        status: 413,
        response: {error: {code: 413, message: 'Quota exceeded'}},
      },
    }

    expect(dispatchErrorMessage(state, res)).toBe('Quota exceeded')
  })
})

describe('showUploadProgress', () => {
  it('shows the fraction sent, then waits indeterminately', () => {
    const appState = {i18n: {strings: {}}}
    const prog = {progress: -1}

    showUploadProgress(appState, prog, 0.4)
    expect(prog.progress).toBe(0.4)
    expect(prog.infoMessage).toBe('Uploading file: 40%')
    showUploadProgress(appState, prog, 1)
    expect(prog.progress).toBe(-1)
    expect(prog.infoMessage).toBe('Processing...')
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

  it('discards an older export that finishes after a newer one', async () => {
    const apiPost = vi
      .fn()
      .mockResolvedValueOnce({task: {id: 'old'}})
      .mockResolvedValueOnce({task: {id: 'new'}})
    const element = makeExport(apiPost)
    const {registerTask} = element.appState

    const older = element._generateExport()
    await vi.waitFor(() => expect(registerTask).toHaveBeenCalledTimes(1))
    const newer = element._generateExport()
    await vi.waitFor(() => expect(registerTask).toHaveBeenCalledTimes(2))
    finishTask('new', {state: 'SUCCESS', result_object: {url: '/new'}})
    await newer
    finishTask('old', {state: 'SUCCESS', result_object: {url: '/old'}})
    await older

    expect(element._downloadUrl).toBe('/new')
  })

  it('discards a running export when another exporter is selected', async () => {
    const apiPost = vi.fn().mockResolvedValue({task: {id: 't1'}})
    const element = makeExport(apiPost)

    const pending = element._generateExport()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    element._handleSelect({target: {value: 'ged'}})
    finishTask('t1', {state: 'SUCCESS', result_object: {url: '/u'}})
    await pending

    expect(element._downloadUrl).toBe('')
  })

  it('clears messages when a new export starts', async () => {
    const apiPost = vi.fn().mockResolvedValue({error: 'nope'})
    const element = makeExport(apiPost)
    element._messages = ['old']

    await element._generateExport()

    expect(element._messages).toEqual([])
  })

  it('clears messages and the finished file when another exporter is selected', () => {
    const element = makeExport(vi.fn())
    element._messages = ['old']
    element._downloadUrl = '/api/exporters/gramps/file/processed/x.gramps'

    element._handleSelect({target: {value: 'ged'}})

    expect(element._messages).toEqual([])
    expect(element._downloadUrl).toBe('')
  })
})

describe('export view: download buttons', () => {
  const mountExport = async () => {
    const el = await mount('grampsjs-view-export', {
      appState: {
        apiGet: vi.fn().mockResolvedValue({data: []}),
        refreshTokenIfNeeded: vi.fn().mockResolvedValue(undefined),
        i18n: {strings: {}},
        permissions: {canViewPrivate: true},
      },
    })
    el.active = true
    await el.updateComplete
    return el
  }
  const buttons = el =>
    [...el.renderRoot.querySelectorAll('md-outlined-button')].map(b =>
      b.textContent.trim()
    )

  it('shows a download button only for finished files', async () => {
    const el = await mountExport()
    expect(buttons(el)).toEqual([])

    el._downloadUrl = '/api/exporters/gramps/file/processed/x.gramps'
    el._mediaDownloadUrl = '/api/media/archive/y.zip'
    await el.updateComplete

    expect(buttons(el)).toEqual(['Download', 'Download'])
  })

  it('does not start the download on its own', async () => {
    const el = await mountExport()
    const click = vi.fn()
    el.renderRoot.querySelector('#downloadanchor').click = click

    el._mediaDownloadUrl = '/api/media/archive/y.zip'
    await el.updateComplete

    expect(click).not.toHaveBeenCalled()
  })

  it('downloads with a fresh token when the button is clicked', async () => {
    const el = await mountExport()
    const anchor = el.renderRoot.querySelector('#downloadanchor')
    anchor.click = vi.fn()
    el._mediaDownloadUrl = '/api/media/archive/y.zip'
    await el.updateComplete

    el.renderRoot.querySelector('md-outlined-button').click()
    await vi.waitFor(() => expect(anchor.click).toHaveBeenCalled())

    expect(el.appState.refreshTokenIfNeeded).toHaveBeenCalled()
    expect(anchor.getAttribute('href')).toMatch(
      /\/api\/media\/archive\/y\.zip\?jwt=/
    )
    expect(anchor.download).toBe('grampsweb-media-export.zip')
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

  it('shows the reason of a failed import', async () => {
    const apiPost = answers({data: preview}, {task: {id: 'i1'}})
    const {element} = makeImport({apiPost})

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    finishTask('i1', {
      state: 'FAILURE',
      result_object: {error: {code: 500, message: 'Import failed\n\nBad'}},
    })
    await pending

    expect(element._importError).toBe('Import failed\n\nBad')
  })

  it('names the failure of a task that reports no reason', async () => {
    const apiPost = answers({data: preview}, {task: {id: 'i1'}})
    const {element} = makeImport({apiPost})

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    finishTask('i1', {state: 'FAILURE'})
    await pending

    expect(element._importError).toBe('Import failed')
  })

  it('shows the upload progress of the running import only', async () => {
    const apiPost = answers({data: preview}, {data: imported})
    const {element} = makeImport({apiPost})
    const prog = element.renderRoot.querySelector('#progress-tree')

    await element._submit()
    const {onUploadProgress} = apiPost.mock.calls[1][2]
    onUploadProgress(0.5)
    expect(prog.progress).toBeUndefined()

    element._op = {}
    apiPost.mockResolvedValueOnce({task: {id: 'p2'}})
    const pending = element._post(element._op, fileA, true)
    await vi.waitFor(() => expect(apiPost).toHaveBeenCalledTimes(3))
    apiPost.mock.calls[2][2].onUploadProgress(0.5)
    expect(prog.progress).toBe(0.5)
    element._op = null
    finishTask('p2', {state: 'SUCCESS', result_object: preview})
    await pending
  })

  it('asks for a home person only when none is set', async () => {
    const run = async settings => {
      const apiPost = answers({data: preview}, {data: imported})
      const {element} = makeImport({apiPost})
      element.appState.settings = settings
      await element._submit()
      return element._askHomePerson
    }

    expect(await run({})).toBe(true)
    expect(await run({homePerson: 'I0001'})).toBe(false)
  })

  it('treats a GEDZip file like a ZIP archive', () => {
    const {element, upload} = makeImport({apiPost: vi.fn()})

    upload.file = new File(['PK'], 'tree.gdz')
    element._handleUploadChanged()

    expect(element._file).toBeNull()
    expect(element._uploadHint).toBeTruthy()
  })

  it('drops the error of an import replaced by another file', async () => {
    const apiPost = answers({data: preview}, {task: {id: 'i1'}})
    const {element, upload} = makeImport({apiPost})

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    upload.file = fileB
    element._handleUploadChanged()
    finishTask('i1', {
      state: 'FAILURE',
      result_object: {error: {code: 500, message: 'Old file is invalid'}},
    })
    await pending

    expect(element._importError).toBe('')
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

describe('import preview dialog: duplicates', () => {
  const mountDialog = async treePeople => {
    const el = await mount('grampsjs-import-preview-dialog', {
      appState: {
        i18n: {strings: {}},
        dbInfo: {object_counts: {people: treePeople}},
      },
    })
    el.counts = {people: 3}
    await el.updateComplete
    return el
  }

  it('warns when the tree already has people', async () => {
    const el = await mountDialog(5)
    expect(el.shadowRoot.querySelector('.alert.warn')).not.toBeNull()
  })

  it('does not warn for an empty tree', async () => {
    const el = await mountDialog(0)
    expect(el.shadowRoot.querySelector('.alert.warn')).toBeNull()
  })
})

describe('media import: result', () => {
  const zip = new File(['PK'], 'media.zip')

  const makeMediaImport = apiPost => {
    const element = new GrampsjsImportMedia()
    const root = element.createRenderRoot()
    const upload = document.createElement('div')
    upload.id = 'upload-media'
    upload.file = zip
    upload.reset = vi.fn()
    root.append(makeProgress('progress-media'), upload)
    element.renderRoot = root
    element.appState = {apiPost, registerTask: vi.fn(), i18n: {strings: {}}}
    element._handleUploadChanged()
    return element
  }

  it('keeps the result of a finished media import task', async () => {
    const result = {
      missing: 3,
      uploaded: 1,
      failures: 0,
      not_found: [{handle: 'h', gramps_id: 'M0002', path: 'a/b.jpg'}],
    }
    const element = makeMediaImport(
      vi.fn().mockResolvedValue({task: {id: 'm1'}})
    )

    const pending = element._submit()
    await vi.waitFor(() =>
      expect(element.appState.registerTask).toHaveBeenCalled()
    )
    finishTask('m1', {state: 'SUCCESS', result_object: result})
    await pending

    expect(element._result).toEqual(result)
    expect(element._busy).toBe(false)
    expect(element._file).toBeNull()
  })

  it('shows readable upload errors', async () => {
    const element = makeMediaImport(
      vi.fn().mockResolvedValue({
        error: 'Error 413',
        errorDetail: {status: 413, response: {}},
      })
    )

    await element._submit()

    expect(element._error).toBe(
      'The file is too large for the server to accept.'
    )
    expect(element._result).toBeNull()
  })

  const renderResult = async result => {
    const el = await mount('grampsjs-import-media', {
      appState: {
        i18n: {strings: {}},
        dbInfo: {object_counts: {media: 4}},
      },
    })
    el._result = result
    await el.updateComplete
    return el.shadowRoot.querySelector('.card')
  }

  it('lists the media objects the archive has no file for', async () => {
    const card = await renderResult({
      missing: 3,
      uploaded: 1,
      failures: 0,
      not_found: [
        {handle: 'h2', gramps_id: 'M0002', path: 'a/b.jpg'},
        {handle: 'h3', gramps_id: 'M0003', path: 'c.jpg'},
      ],
    })

    expect(card.textContent).toContain(
      'Files were found for 1 of 3 media objects without a file.'
    )
    expect(card.querySelector('summary').textContent).toContain(
      'The archive has no file for 2 media objects.'
    )
    expect([...card.querySelectorAll('.path')].map(p => p.textContent)).toEqual(
      ['a/b.jpg', 'c.jpg']
    )
  })

  it("doesn't relate counts of older backends to media objects", async () => {
    const card = await renderResult({missing: 2, uploaded: 1, failures: 0})

    expect(card.textContent).toContain('The import has completed.')
    expect(card.textContent).not.toContain('media objects without a file')
  })
})
