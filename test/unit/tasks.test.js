import {describe, it, expect, afterEach, vi} from 'vitest'
import '../../src/components/GrampsjsTasks.js'
import {GrampsjsViewTasks} from '../../src/views/GrampsjsViewTasks.js'
import {priorityLabel, sortTasks} from '../../src/taskConstants.js'

// tippy.js cannot find the tooltip targets in happy-dom
vi.mock('tippy.js', () => ({default: () => ({setContent() {}})}))

// The filter bar holds Material form fields, which need ElementInternals
// that happy-dom does not implement. Its slotted buttons stay in the list.
vi.mock('../../src/components/GrampsjsFilters.js', () => {
  customElements.define('grampsjs-filters', class extends HTMLElement {})
  return {}
})

// The Material checkboxes call attachInternals(), which happy-dom does not
// implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {setFormValue() {}, setValidity() {}}
  }
}

function task(handle, {status, priority} = {}) {
  const attributes = []
  if (status !== undefined) attributes.push({type: 'Status', value: status})
  if (priority !== undefined) {
    attributes.push({type: 'Priority', value: priority})
  }
  return {
    handle,
    gramps_id: `S${handle}`,
    title: `Task ${handle}`,
    attribute_list: attributes,
    extended: {tags: []},
  }
}

describe('priorityLabel', () => {
  it('maps numbers below, at and above 5', () => {
    expect(priorityLabel('1')).toBe('High')
    expect(priorityLabel('4')).toBe('High')
    expect(priorityLabel('5')).toBe('Medium')
    expect(priorityLabel('6')).toBe('Low')
    expect(priorityLabel('9')).toBe('Low')
  })

  it('has no label for a missing or non-numeric priority', () => {
    expect(priorityLabel(undefined)).toBe('')
    expect(priorityLabel('')).toBe('')
    expect(priorityLabel('urgent')).toBe('')
  })
})

describe('sortTasks', () => {
  const handles = tasks => sortTasks(tasks).map(t => t.handle)

  it('sorts by status with unknown statuses before Done', () => {
    expect(
      handles([
        task('done', {status: 'Done'}),
        task('waiting', {status: 'Waiting'}),
        task('none'),
        task('blocked', {status: 'Blocked'}),
        task('open', {status: 'Open'}),
        task('progress', {status: 'In Progress'}),
      ])
    ).toEqual(['open', 'progress', 'blocked', 'waiting', 'none', 'done'])
  })

  it('sorts by priority within a status, missing priorities last', () => {
    expect(
      handles([
        task('none', {status: 'Open'}),
        task('low', {status: 'Open', priority: '9'}),
        task('high', {status: 'Open', priority: '1'}),
        task('medium', {status: 'Open', priority: '5'}),
        task('odd', {status: 'Open', priority: 'x'}),
      ])
    ).toEqual(['high', 'medium', 'low', 'none', 'odd'])
  })

  it('keeps the order of tasks that tie', () => {
    expect(
      handles([
        task('b', {status: 'Open', priority: '5'}),
        task('a', {status: 'Open', priority: '5'}),
      ])
    ).toEqual(['b', 'a'])
  })
})

const mounted = []

function appStateFor({canEdit = true, settings = {}} = {}) {
  return {
    i18n: {lang: 'en', strings: {}},
    permissions: {canEdit, canAdd: canEdit},
    settings,
    updateSettings: vi.fn(),
  }
}

async function mount(props) {
  const el = document.createElement('grampsjs-tasks')
  Object.assign(el, {appState: appStateFor(), ...props})
  el.updates = []
  el.addEventListener('tasks:update-attribute', e => el.updates.push(e.detail))
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const $ = (el, selector) => el.shadowRoot.querySelector(selector)
const $$ = (el, selector) => [...el.shadowRoot.querySelectorAll(selector)]
const rows = el => $$(el, '.task-item')
const rowCheckbox = (el, index) => rows(el)[index].querySelector('md-checkbox')

async function check(el, index) {
  rowCheckbox(el, index).dispatchEvent(new Event('change'))
  await el.updateComplete
}

describe('GrampsjsTasks', () => {
  const data = [task('a'), task('b'), task('c', {status: 'Done'})]

  it('links the titles to the tasks', async () => {
    const el = await mount({data})
    const link = $(el, '.task-item a')
    expect(link.getAttribute('href')).toBe('/task/Sa')
    expect(link.textContent).toBe('Task a')
  })

  it('opens a task by clicking its row, also inside a link', async () => {
    const link = document.createElement('a')
    document.body.appendChild(link)
    const el = await mount({data})
    link.appendChild(el)
    await el.updateComplete
    const paths = []
    el.addEventListener('nav', e => paths.push(e.detail.path))
    $$(el, '.task-item .status-icon')[1].click()
    expect(paths).toEqual(['task/Sb'])
  })

  it('leaves clicks on the title to the link', async () => {
    const el = await mount({data})
    const paths = []
    el.addEventListener('nav', e => paths.push(e.detail.path))
    $(el, '.task-item a').addEventListener('click', e => e.preventDefault())
    $(el, '.task-item a').click()
    expect(paths).toEqual([])
  })

  it('offers selection only to editors', async () => {
    const el = await mount({data, appState: appStateFor({canEdit: false})})
    expect($(el, 'md-checkbox')).toBeNull()
    expect($(el, '.batch-toolbar')).toBeNull()
  })

  it('shows a checkbox on every row and the bulk actions to editors', async () => {
    const el = await mount({data})
    expect($$(el, '.task-item md-checkbox')).toHaveLength(3)
    const actions = $$(el, '.batch-actions md-outlined-button')
    expect(actions).toHaveLength(2)
    expect(actions.every(button => button.disabled)).toBe(true)
  })

  it('selects with the checkbox and shows a partial select-all', async () => {
    const el = await mount({data})
    await check(el, 1)
    expect(el._selectedHandles).toEqual(['b'])
    const all = $(el, '.batch-toolbar md-checkbox')
    expect(all.indeterminate).toBe(true)
    expect(all.checked).toBe(false)
    expect(rows(el)[1].classList.contains('selected')).toBe(true)
    const actions = $$(el, '.batch-actions md-outlined-button')
    expect(actions.some(button => button.disabled)).toBe(false)
  })

  it('shows the icons of the priorities and statuses in the menus', async () => {
    const el = await mount({data})
    const icons = id =>
      $$(el, `#${id}-menu md-menu-item grampsjs-icon[slot="start"]`)
    expect(icons('prio')).toHaveLength(3)
    expect(icons('status')).toHaveLength(4)
    expect(icons('status')[3].getAttribute('color')).toBe(
      'var(--grampsjs-task-done-solid)'
    )
  })

  it('leaves clicks on the checkbox to the checkbox', async () => {
    const el = await mount({data})
    const paths = []
    el.addEventListener('nav', e => paths.push(e.detail.path))
    rowCheckbox(el, 0).click()
    expect(paths).toEqual([])
  })

  it('selects all, then none', async () => {
    const el = await mount({data})
    await check(el, 0)
    el._handleSelectAll()
    expect(el._selectedHandles).toEqual(['a', 'b', 'c'])
    el._handleSelectAll()
    expect(el._selectedHandles).toEqual([])
  })

  it('updates the selected tasks after the list reloads in a new order', async () => {
    const el = await mount({data})
    await check(el, 0)
    el.data = [task('b'), task('a'), task('c')]
    await el.updateComplete
    el._updateAttribute('Status', 'Done')
    expect(el.updates).toHaveLength(1)
    expect(el.updates[0].objects.map(t => t.handle)).toEqual(['a'])
    expect(el.updates[0]).toMatchObject({key: 'Status', value: 'Done'})
    expect(el._selectedHandles).toEqual([])
  })

  it('drops selected tasks that are no longer listed', async () => {
    const el = await mount({data})
    await check(el, 0)
    await check(el, 1)
    el.data = [task('b'), task('c')]
    await el.updateComplete
    expect(el._selectedHandles).toEqual(['b'])
  })

  it('says so when there are no tasks', async () => {
    const el = await mount({data: []})
    expect($(el, '.empty').textContent).toBe('None')
  })

  it('shows nothing while the first list loads', async () => {
    const el = await mount({data: [], loading: true})
    expect($(el, '.empty')).toBeNull()
  })
})

describe('GrampsjsViewTasks bulk update', () => {
  // the view's state that the bulk update uses
  function makeView(results) {
    const view = {
      events: [],
      appState: {apiPut: vi.fn(async () => results.shift())},
      _handleUpdateAttribute:
        GrampsjsViewTasks.prototype._handleUpdateAttribute,
    }
    view.dispatchEvent = e => view.events.push(e)
    return view
  }

  const update = objects => ({
    detail: {objects, key: 'Status', value: 'Done'},
  })

  it('replaces the attribute of every task', async () => {
    const view = makeView([{data: {}}, {data: {}}])
    const t = task('a', {status: 'Open', priority: '1'})
    await view._handleUpdateAttribute(update([t, task('b')]))
    expect(view.appState.apiPut).toHaveBeenCalledTimes(2)
    const [url, body] = view.appState.apiPut.mock.calls[0]
    expect(url).toBe('/api/sources/a')
    expect(body.attribute_list).toEqual([
      {type: 'Priority', value: '1'},
      {_class: 'SrcAttribute', type: 'Status', value: 'Done'},
    ])
    expect(view.events.map(e => e.type)).toEqual(['db:changed'])
  })

  it('reports the first failure and still reloads', async () => {
    const view = makeView([{error: 'one'}, {data: {}}, {error: 'two'}])
    await view._handleUpdateAttribute(update([task('a'), task('b'), task('c')]))
    expect(view.appState.apiPut).toHaveBeenCalledTimes(3)
    expect(view.events.map(e => e.type)).toEqual([
      'db:changed',
      'grampsjs:error',
    ])
    expect(view.events[1].detail).toEqual({message: 'one'})
  })
})
