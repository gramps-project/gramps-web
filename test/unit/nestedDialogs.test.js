import {describe, it, expect, vi} from 'vitest'
import {html, render} from 'lit'
import '../../src/components/GrampsjsAttributes.js'
import '../../src/components/GrampsjsFormEditAttribute.js'

const appState = {
  i18n: {strings: {}, lang: 'en'},
  permissions: {},
  settings: {},
  apiGet: async () => ({data: {}}),
}

async function mount(template) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  render(template, container)
  const el = container.firstElementChild
  await el.updateComplete
  return el
}

const escape = path => ({key: 'Escape', composedPath: () => path})

describe('Escape in a dialog inside a dialog', () => {
  it('closes the form whose dialog it was pressed in', async () => {
    const form = await mount(
      html`<grampsjs-form-edit-attribute
        noReset
        .appState="${appState}"
      ></grampsjs-form-edit-attribute>`
    )
    const cancel = vi.fn()
    form.addEventListener('object:cancel', cancel)
    const own = form.renderRoot.querySelector('md-dialog')
    const outer = document.createElement('md-dialog')
    form._handleDialogKeydown(escape([own, outer]))
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('leaves the form around it open', async () => {
    const form = await mount(
      html`<grampsjs-form-edit-attribute
        noReset
        .appState="${appState}"
      ></grampsjs-form-edit-attribute>`
    )
    const cancel = vi.fn()
    form.addEventListener('object:cancel', cancel)
    const own = form.renderRoot.querySelector('md-dialog')
    const inner = document.createElement('md-dialog')
    form._handleDialogKeydown(escape([inner, own]))
    expect(cancel).not.toHaveBeenCalled()
  })
})

describe('attributes of a secondary object', () => {
  const data = [
    {
      _class: 'Attribute',
      type: 'Occupation',
      value: 'Farmer',
      citation_list: ['c1'],
      note_list: ['n1'],
    },
  ]

  it('show no counts of their own citations and notes', async () => {
    const own = await mount(
      html`<grampsjs-attributes
        .appState="${appState}"
        .data="${data}"
      ></grampsjs-attributes>`
    )
    const nested = await mount(
      html`<grampsjs-attributes
        nested
        .appState="${appState}"
        .data="${data}"
      ></grampsjs-attributes>`
    )
    expect(own.renderRoot.querySelector('button.ref-counts')).not.toBe(null)
    expect(nested.renderRoot.querySelector('button.ref-counts')).toBe(null)
  })

  it('are edited without their citations and notes', async () => {
    const list = await mount(
      html`<grampsjs-attributes
        nested
        edit
        hasEdit
        .appState="${appState}"
        .data="${data}"
      ></grampsjs-attributes>`
    )
    list._selectedIndex = 0
    list._handleEdit()
    await list.updateComplete
    const form = list.renderRoot.querySelector('grampsjs-form-edit-attribute')
    expect(form.nested).toBe(true)
    expect(form.data).to.deep.equal({
      type: 'Occupation',
      value: 'Farmer',
      private: false,
    })
  })
})
