import {describe, it, expect, afterEach, vi} from 'vitest'

// tippy.js cannot find the tooltip targets in happy-dom
vi.mock('tippy.js', () => ({default: () => ({setContent() {}})}))

// The page's child components are not under test here
function stub(name) {
  return () => {
    customElements.define(name, class extends HTMLElement {})
    return {}
  }
}
vi.mock('../../src/components/GrampsjsEditor.js', stub('grampsjs-editor'))
vi.mock('../../src/components/GrampsjsGallery.js', stub('grampsjs-gallery'))
vi.mock('../../src/components/GrampsjsTags.js', stub('grampsjs-tags'))
vi.mock(
  '../../src/components/GrampsjsConnectedNote.js',
  stub('grampsjs-connected-note')
)
vi.mock(
  '../../src/components/GrampsjsFormNewTag.js',
  stub('grampsjs-form-new-tag')
)

// The Material selects call attachInternals(), which happy-dom does not
// implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {setFormValue() {}, setValidity() {}}
  }
}

// The Material selects and dialogs animate, which happy-dom does not
// implement.
if (!HTMLElement.prototype.animate) {
  HTMLElement.prototype.animate = function animate() {
    return {
      addEventListener() {},
      cancel() {},
      finished: Promise.resolve(),
    }
  }
}

const {GrampsjsViewTask} = await import('../../src/views/GrampsjsViewTask.js')

const mounted = []

const TODO = {handle: 'todo', name: 'ToDo'}

function source({
  status = 'Open',
  priority = '5',
  notes = [],
  media = [],
} = {}) {
  return {
    handle: 's1',
    gramps_id: 'S0001',
    title: 'Find the census',
    attribute_list: [
      {type: 'Status', value: status},
      {type: 'Priority', value: priority},
    ],
    note_list: notes.map(note => note.handle),
    media_list: media,
    tag_list: ['todo'],
    extended: {notes, media: [], tags: [TODO]},
  }
}

async function mount(data, {canEdit = true} = {}) {
  const el = document.createElement('grampsjs-task')
  el.appState = {
    i18n: {lang: 'en', strings: {}},
    permissions: {canEdit, canAdd: canEdit},
  }
  el.source = data
  el.events = []
  for (const name of ['edit:action', 'task:delete']) {
    el.addEventListener(name, e => el.events.push({name, detail: e.detail}))
  }
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const $ = (el, selector) => el.shadowRoot.querySelector(selector)
const headings = el =>
  [...el.shadowRoot.querySelectorAll('h3')].map(h => h.textContent)

describe('task page for viewers', () => {
  it('shows status and priority as text', async () => {
    const el = await mount(source({status: 'Blocked', priority: '1'}), {
      canEdit: false,
    })
    expect($(el, 'md-outlined-select')).toBeNull()
    const text = $(el, '.properties').textContent.replace(/\s+/g, ' ')
    expect(text).toContain('Status Blocked')
    expect(text).toContain('Priority High')
  })

  it('hides empty sections and the page actions', async () => {
    const el = await mount(source(), {canEdit: false})
    expect(headings(el)).toEqual([])
    expect($(el, '.page-actions')).toBeNull()
    expect($(el, '.edit')).toBeNull()
  })

  it('shows the description when there is one', async () => {
    const note = {handle: 'n1', text: {string: 'Look in 1900'}}
    const el = await mount(source({notes: [note]}), {canEdit: false})
    expect(headings(el)).toEqual(['Description'])
    expect($(el, 'grampsjs-connected-note').getAttribute('handle')).toBe('n1')
  })
})

describe('task page for editors', () => {
  it('shows the empty sections with their edit buttons', async () => {
    const el = await mount(source())
    expect(headings(el)).toEqual(['Description', 'Attachments', 'Tags'])
    expect($(el, '#btn-edit-note')).not.toBeNull()
    expect($(el, '#btn-edit-gallery')).not.toBeNull()
  })

  it('starts a missing description from empty text', async () => {
    const el = await mount(source())
    $(el, '#btn-edit-note').click()
    await el.updateComplete
    expect($(el, '#task-note-editor').initialData).toEqual({
      _class: 'StyledText',
      string: '',
      tags: [],
    })
  })

  it('offers an unknown status in the status select', async () => {
    const el = await mount(source({status: 'Waiting'}))
    const values = [
      ...el.shadowRoot.querySelectorAll('#select-status md-select-option'),
    ].map(option => option.getAttribute('value'))
    expect(values).toEqual([
      'Open',
      'In Progress',
      'Blocked',
      'Done',
      'Waiting',
    ])
  })

  it('updates the attribute that changed', async () => {
    const el = await mount(source())
    el._setAttribute('Status', 'Done')
    el._setAttribute('Priority', '5')
    expect(el.events).toEqual([
      {
        name: 'edit:action',
        detail: {
          action: 'updateAttribute',
          data: {type: 'Status', value: 'Done'},
          index: 0,
        },
      },
    ])
  })

  it('adds a missing attribute', async () => {
    const data = source()
    data.attribute_list = []
    const el = await mount(data)
    el._setAttribute('Priority', '1')
    expect(el.events[0].detail).toEqual({
      action: 'addAttribute',
      data: {type: 'Priority', value: '1'},
    })
  })

  it('links to the source', async () => {
    const el = await mount(source())
    expect($(el, '#btn-source').getAttribute('href')).toBe('/source/S0001')
  })

  it('deletes only after confirming', async () => {
    const el = await mount(source())
    $(el, '#btn-delete').click()
    await el.updateComplete
    const buttons = [
      ...el.shadowRoot.querySelectorAll('md-dialog md-text-button'),
    ]
    expect(el.events).toEqual([])
    buttons.find(b => b.textContent.includes('Delete')).click()
    await el.updateComplete
    expect(el.events.map(e => e.name)).toEqual(['task:delete'])
    expect($(el, 'md-dialog')).toBeNull()
  })

  it('ends editing the attachments with Done', async () => {
    const el = await mount(source())
    $(el, '#btn-edit-gallery').click()
    await el.updateComplete
    expect($(el, 'grampsjs-gallery').hasAttribute('edit')).toBe(true)
    expect($(el, '#btn-edit-gallery')).toBeNull()
    $(el, '#btn-done-gallery').click()
    await el.updateComplete
    expect($(el, 'grampsjs-gallery')).toBeNull()
  })
})

describe('GrampsjsViewTask', () => {
  it('returns to the task list after deleting, and undo to the task', () => {
    const view = Object.create(GrampsjsViewTask.prototype)
    expect(view._pathAfterDelete).toBe('tasks')
    expect(view._objectPath('S0001')).toBe('task/S0001')
  })

  it('has no edit mode', () => {
    const view = Object.create(GrampsjsViewTask.prototype)
    view._activateEditMode = vi.fn()
    view._toggleEditMode()
    expect(view._activateEditMode).not.toHaveBeenCalled()
  })
})
