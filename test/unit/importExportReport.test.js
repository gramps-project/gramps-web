import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsImportExportReport.js'
import '../../src/components/GrampsjsImportCounts.js'
import {GrampsjsImport} from '../../src/components/GrampsjsImport.js'
import {GrampsjsViewExport} from '../../src/views/GrampsjsViewExport.js'
import {getTaskResult} from '../../src/util.js'

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

describe('export view: report messages', () => {
  const makeExport = apiPost => {
    const element = new GrampsjsViewExport()
    const root = element.createRenderRoot()
    const prog = makeProgress('indicator-export')
    root.append(prog)
    element.renderRoot = root
    element.appState = {apiPost, registerTask: vi.fn()}
    return {element, prog}
  }

  it('keeps messages from a synchronous export', async () => {
    const apiPost = vi.fn().mockResolvedValue({
      data: {url: '/api/exporters/ged/file/processed/x.ged', messages: ['m']},
    })
    const {element, prog} = makeExport(apiPost)

    await element._generateExport()

    expect(element._messages).toEqual(['m'])
    expect(element._downloadUrl).toBe('/api/exporters/ged/file/processed/x.ged')
    expect(prog.setComplete).toHaveBeenCalled()
  })

  it('keeps messages from a finished export task', () => {
    const {element} = makeExport(vi.fn())

    element._handleTaskComplete({
      detail: {
        status: {result_object: {url: '/u', messages: ['a', 'b']}},
      },
    })

    expect(element._messages).toEqual(['a', 'b'])
    expect(element._downloadUrl).toBe('/u')
  })

  it('clears messages when a new export starts', async () => {
    const apiPost = vi.fn().mockResolvedValue({task: {id: 't1'}})
    const {element} = makeExport(apiPost)
    element._messages = ['old']

    await element._generateExport()

    expect(element._messages).toEqual([])
  })

  it('clears messages when another exporter is selected', () => {
    const {element} = makeExport(vi.fn())
    element._messages = ['old']

    element._handleSelect({target: {value: 'gramps'}})

    expect(element._messages).toEqual([])
  })
})

describe('import: preview and result', () => {
  const makeImport = apiPost => {
    const element = new GrampsjsImport()
    const root = element.createRenderRoot()
    const prog = makeProgress('progress-tree')
    const dialog = document.createElement('grampsjs-import-preview-dialog')
    dialog.show = vi.fn()
    const upload = document.createElement('div')
    upload.id = 'upload-tree'
    upload.reset = vi.fn()
    root.append(prog, dialog, upload)
    element.renderRoot = root
    element.appState = {apiPost, registerTask: vi.fn()}
    vi.spyOn(element, 'dispatchEvent')
    return {element, dialog}
  }

  const result = {people: 2, families: 1, messages: ['line 1\nline 2']}

  it('passes dry run messages from a synchronous response to the dialog', async () => {
    const apiPost = vi.fn().mockResolvedValue({data: result})
    const {element, dialog} = makeImport(apiPost)

    await element._submitPreview('ged', new Blob(['0 HEAD']))

    expect(element._previewCounts).toEqual(result)
    expect(element._previewMessages).toEqual(['line 1\nline 2'])
    expect(dialog.show).toHaveBeenCalled()
  })

  it('passes dry run messages from a finished task to the dialog', () => {
    const {element, dialog} = makeImport(vi.fn())
    element._previewPending = true

    element._handleTaskComplete({detail: {status: {result_object: result}}})

    expect(element._previewMessages).toEqual(['line 1\nline 2'])
    expect(element._importResult).toBeNull()
    expect(dialog.show).toHaveBeenCalled()
  })

  it('keeps the result of a synchronous import', async () => {
    const apiPost = vi.fn().mockResolvedValue({data: result})
    const {element} = makeImport(apiPost)

    await element._submitTree('ged', new Blob(['0 HEAD']))

    expect(element._importResult).toEqual(result)
    const events = element.dispatchEvent.mock.calls.map(([e]) => e.type)
    expect(events).toContain('db:changed')
  })

  it('keeps the result of a finished import task', () => {
    const {element} = makeImport(vi.fn())
    element._previewPending = false

    element._handleTaskComplete({detail: {status: {result_object: result}}})

    expect(element._importResult).toEqual(result)
  })

  it('clears the result when a new file is chosen', () => {
    const {element} = makeImport(vi.fn())
    element._importResult = result

    element._handleUploadChanged()

    expect(element._importResult).toBeNull()
  })
})
