import {describe, it, expect} from 'vitest'
import {LitElement, html} from 'lit'
import {GrampsjsAppStateMixin} from '../../src/mixins/GrampsjsAppStateMixin.js'

// happy-dom lacks attachInternals, which md-select needs, so this stands in
// for it: it reads the headline of its selected option on its first
// connection and when asked to, as md-select does
class StubSelect extends HTMLElement {
  connectedCallback() {
    queueMicrotask(() => this.updateValueAndDisplayText())
  }

  updateValueAndDisplayText() {
    const option = this.querySelector('[selected]')
    this.displayText = option?.textContent.trim() ?? ''
  }
}
window.customElements.define('md-filled-select', StubSelect)
window.customElements.define('md-outlined-select', class extends StubSelect {})

class TestSelects extends GrampsjsAppStateMixin(LitElement) {
  render() {
    return html`
      <md-filled-select>
        <div selected>${this._('Horizontal')}</div>
        <div>${this._('Vertical')}</div>
      </md-filled-select>
      <md-outlined-select>
        <div selected>${this._('Surname, Given')}</div>
      </md-outlined-select>
    `
  }
}
window.customElements.define('grampsjs-test-selects', TestSelects)

const strings = {
  Horizontal: 'Poziomo',
  Vertical: 'Pionowo',
  'Surname, Given': 'Nazwisko, imię',
}

async function makeElement() {
  const element = document.createElement('grampsjs-test-selects')
  element.appState = {i18n: {strings: {}, lang: 'en'}}
  document.body.append(element)
  await element.updateComplete
  await Promise.resolve()
  return element
}

function displayTexts(element) {
  return [
    ...element.renderRoot.querySelectorAll(
      'md-filled-select, md-outlined-select'
    ),
  ].map(select => select.displayText)
}

describe('selects of translatable components', () => {
  it('show the selected option in strings that arrive later', async () => {
    const element = await makeElement()
    expect(displayTexts(element)).to.deep.equal([
      'Horizontal',
      'Surname, Given',
    ])

    element.appState = {i18n: {strings, lang: 'pl'}}
    await element.updateComplete

    expect(displayTexts(element)).to.deep.equal(['Poziomo', 'Nazwisko, imię'])
    element.remove()
  })

  it('leave the selects alone when the strings stay the same', async () => {
    const element = await makeElement()
    const select = element.renderRoot.querySelector('md-filled-select')
    select.displayText = 'untouched'

    element.appState = {...element.appState, path: 'tree'}
    await element.updateComplete

    expect(select.displayText).to.equal('untouched')
    element.remove()
  })
})
