import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textarea'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsEditor.js'

export class GrampsjsViewNewNote extends GrampsjsViewNewObject {
  constructor () {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
    this.postUrl = '/api/notes/'
    this.itemPath = 'note'
    this.objClass = 'Note'
  }

  renderContent () {
    return html`
    <h2>${this._('New Note')}</h2>

    <p>
      <grampsjs-editor
        @formdata:changed="${this.handleEditor}"
        id="note-editor"
      ></grampsjs-editor>
    </p>

    <grampsjs-form-select-type
      id="select-note-type"
      .strings="${this.strings}"
      ?loadingTypes="${this.loadingTypes}"
      ?disabled="${this.loadingTypes}"
      typeName="note_types"
      defaultTypeName="General"
      .types="${this.types}"
      .typesLocale="${this.typesLocale}"
    >
    </grampsjs-form-select-type>

    <div class="spacer"></div>
    <grampsjs-form-private id="private" .strings="${this.strings}"></grampsjs-form-private>

    ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  checkFormValidity () {
    const noteText = this.shadowRoot.querySelector('grampsjs-editor')
    this.isFormValid = (noteText.data.string.trim() !== '')
  }

  handleEditor (e) {
    this.checkFormValidity()
    this.data = {...this.data, text: e.detail.data}
  }

  _handleFormData (e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-note-type') {
      this.data = {...this.data, type: {_class: 'NoteType', string: e.detail.data}}
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }

  _reset () {
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
