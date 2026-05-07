import {html} from 'lit'
import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewNoteMixin} from '../mixins/GrampsjsNewNoteMixin.js'

export class GrampsjsViewNewNote extends GrampsjsNewNoteMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
    this.postUrl = '/api/notes/'
    this.itemPath = 'note'
    this.objClass = 'Note'
  }

  renderContent() {
    return html`
      <h2>${this._('New Note')}</h2>

      ${this.renderForm()} ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  checkFormValidity() {
    const noteText = this.shadowRoot.querySelector('grampsjs-editor')
    this.isFormValid = noteText.data.string.trim() !== ''
  }

  handleEditor(e) {
    this.checkFormValidity()
    this.data = {...this.data, text: e.detail.data}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-note-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }

  _reset() {
    const text = this.shadowRoot.querySelector('grampsjs-editor')
    text.reset()
    const noteType = this.shadowRoot.getElementById('select-note-type')
    noteType.reset()
    const priv = this.shadowRoot.getElementById('private')
    priv.reset()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
  }
}

window.customElements.define('grampsjs-view-new-note', GrampsjsViewNewNote)
