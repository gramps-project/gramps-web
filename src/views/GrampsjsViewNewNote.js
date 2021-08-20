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


export class GrampsjsViewNewNote extends GrampsjsViewNewObject {

  constructor() {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
    this.postUrl = '/api/notes/'
    this.itemPath = 'note'
  }

  renderContent() {
    return html`
    <h2>${this._('New Note')}</h2>

    <h4 class="label">${this._('Note')}</h4>
    <p>
      <mwc-textarea
        outlined
        rows="6"
        style="width:100%;"
        @input="${this.handleText}"
        id="note-text"
      ></mwc-textarea>
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
    <grampsjs-form-private id="private"></grampsjs-form-private>

    ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }


  checkFormValidity() {
    const noteText = this.shadowRoot.getElementById('note-text')
    this.isFormValid = (noteText.value.trim() !== '')
  }

  handleText(e) {
    this.checkFormValidity()
    this.data = {...this.data, text: {_class: 'StyledText', string: e.target.value.trim()}}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    if (e.originalTarget.id === 'select-note-type') {
      this.data = {...this.data, type: {_class: 'NoteType', string: e.detail.data}}
    }
    if (e.originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }

  _reset() {
    const text = this.shadowRoot.getElementById('note-text')
    text.value = ''
    const noteType = this.shadowRoot.getElementById('select-note-type')
    noteType.reset()
    const priv = this.shadowRoot.getElementById('private')
    priv.reset()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
  }
}

window.customElements.define('grampsjs-view-new-note', GrampsjsViewNewNote)
