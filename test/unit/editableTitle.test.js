import {describe, it, expect, afterEach, vi} from 'vitest'
import '../../src/components/GrampsjsEditableTitle.js'

// tippy.js cannot find the tooltip targets in happy-dom
vi.mock('tippy.js', () => ({default: () => ({setContent() {}})}))

const mounted = []

const appState = {i18n: {lang: 'en', strings: {}}}

async function mount(props) {
  const el = document.createElement('grampsjs-editable-title')
  Object.assign(el, {appState, ...props})
  el.actions = []
  el.addEventListener('edit:action', e => el.actions.push(e.detail))
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const input = el => el.shadowRoot.querySelector('input')
const editButton = el => el.shadowRoot.getElementById('btn-edit')

// opens the editor and types `text` into it
async function edit(el, text) {
  await el._handleEdit()
  input(el).value = text
  input(el).dispatchEvent(new Event('input'))
  await el.updateComplete
}

async function key(el, name) {
  input(el).dispatchEvent(
    new KeyboardEvent('keydown', {key: name, cancelable: true})
  )
  await el.updateComplete
}

describe('grampsjs-editable-title', () => {
  it('shows the value, or the placeholder if it is empty', async () => {
    const el = await mount({value: 'Census 1900', placeholder: 'Source'})
    expect(el.shadowRoot.textContent).toContain('Census 1900')
    el.value = ''
    await el.updateComplete
    expect(el.shadowRoot.textContent).toContain('Source')
  })

  it('shows the edit button only when editable', async () => {
    const el = await mount({value: 'A'})
    expect(editButton(el)).toBeNull()
    el.editable = true
    await el.updateComplete
    expect(editButton(el)).not.toBeNull()
  })

  it('starts editing when the text is clicked, only if editable', async () => {
    const el = await mount({value: 'Old'})
    const text = () => el.shadowRoot.querySelector('.text')
    text().click()
    await el.updateComplete
    expect(input(el)).toBeNull()
    el.editable = true
    await el.updateComplete
    text().click()
    await el.updateComplete
    expect(input(el).value).toBe('Old')
  })

  it('fills the input with the value when editing starts', async () => {
    const el = await mount({value: 'Old', editable: true})
    await el._handleEdit()
    expect(input(el).value).toBe('Old')
  })

  it('saves the trimmed text on Enter', async () => {
    const el = await mount({value: 'Old', prop: 'name', editable: true})
    await edit(el, '  New  ')
    await key(el, 'Enter')
    expect(el.actions).toEqual([{action: 'updateProp', data: {name: 'New'}}])
    expect(input(el)).toBeNull()
  })

  it('saves when the input loses focus', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'New')
    input(el).dispatchEvent(new Event('blur'))
    await el.updateComplete
    expect(el.actions).toEqual([{action: 'updateProp', data: {title: 'New'}}])
    expect(input(el)).toBeNull()
  })

  it('discards the text on Escape', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'New')
    await key(el, 'Escape')
    expect(el.actions).toEqual([])
    expect(input(el)).toBeNull()
  })

  it('does not save an unchanged text', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'Old ')
    await key(el, 'Enter')
    expect(el.actions).toEqual([])
    expect(input(el)).toBeNull()
  })

  it('keeps editing when Enter is pressed on an empty required text', async () => {
    const el = await mount({value: 'Old', editable: true, required: true})
    await edit(el, '   ')
    await key(el, 'Enter')
    expect(el.actions).toEqual([])
    expect(input(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('discards an empty required text when the input loses focus', async () => {
    const el = await mount({value: 'Old', editable: true, required: true})
    await edit(el, '')
    input(el).dispatchEvent(new Event('blur'))
    await el.updateComplete
    expect(el.actions).toEqual([])
    expect(input(el)).toBeNull()
  })

  it('saves an empty text if it is not required', async () => {
    const el = await mount({value: 'Old', prop: 'desc', editable: true})
    await edit(el, '')
    await key(el, 'Enter')
    expect(el.actions).toEqual([{action: 'updateProp', data: {desc: ''}}])
  })

  it('keeps the typed text when the value is reloaded', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'Typing')
    el.value = 'Reloaded'
    await el.updateComplete
    expect(input(el).value).toBe('Typing')
  })

  it('does not save an untouched text over a reloaded value', async () => {
    const el = await mount({value: 'Old', editable: true})
    await el._handleEdit()
    el.value = 'Reloaded'
    await el.updateComplete
    input(el).dispatchEvent(new Event('blur'))
    await el.updateComplete
    expect(el.actions).toEqual([])
  })

  it('leaves Enter to an input method editor while composing', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'New')
    input(el).dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', isComposing: true})
    )
    await el.updateComplete
    expect(input(el)).not.toBeNull()
    expect(el.actions).toEqual([])
  })

  it('focuses the edit button after Enter, but not after a blur', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'New')
    await key(el, 'Enter')
    await el.updateComplete
    expect(el.shadowRoot.activeElement).toBe(editButton(el))

    const other = document.createElement('input')
    document.body.appendChild(other)
    await edit(el, 'Newer')
    other.focus()
    input(el)?.dispatchEvent(new Event('blur'))
    await el.updateComplete
    await el.updateComplete
    expect(el.shadowRoot.activeElement).not.toBe(editButton(el))
    other.remove()
  })

  it('stops editing when it is no longer editable', async () => {
    const el = await mount({value: 'Old', editable: true})
    await edit(el, 'New')
    el.editable = false
    await el.updateComplete
    expect(input(el)).toBeNull()
    expect(el.actions).toEqual([])
  })
})
