import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textarea'
import '@material/mwc-switch'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'


export class GrampsjsViewNewNote extends GrampsjsViewNewObject {

  constructor() {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
    this.postUrl = '/api/notes/'
    this.itemPath = 'note'
  }

  renderContent() {
    const defaultTypesLocale = this.defaultTypesLocale?.note_types || []
    const customTypesLocale = this.customTypesLocale?.note_types || []
    const typesLocale = defaultTypesLocale.concat(customTypesLocale)
    const defaultTypes = this.defaultTypes?.note_types || []
    const customTypes = this.customTypes?.note_types || []
    const types = defaultTypes.concat(customTypes)
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

    <h4 class="label">${this._('Type')}</h4>
    <p>
      <mwc-select
        @change="${this.handleType}"
        style="width:100%"
        ?disabled="${this.loadingTypes}"
        label="${this.loadingTypes ? this._('Loading items...') : ''}"
        id="note-type"
      >
          ${this.loadingTypes ? '' : types.map((obj, i) => html`
          <mwc-list-item value="${typesLocale[i]}" ?selected="${obj === 'General'}">${this._(obj)}</mwc-list-item>
          `)}
      </mwc-select>
    </p>

    <div class="spacer"></div>
    <p>
      <mwc-formfield label="${this._('Private')}" id="switch-private">
        <mwc-switch @change="${this.handlePrivate}"></mwc-switch>
      </mwc-formfield>
    </p>

    <div class="spacer"></div>
    <p class="right">
      <mwc-button outlined label="${this._('Cancel')}" type="reset" @click="${this._reset}" icon="cancel">
      </mwc-button>
      <mwc-button raised label="${this._('Add')}" type="submit" @click="${this._submit}" icon="save">
        <span slot="trailingIcon" style="display:none;">
          <mwc-circular-progress indeterminate density="-7" closed id="login-progress">
          </mwc-circular-progress>
        </span>
      </mwc-button>
    </p>
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }


  handleText(e) {
    this.data = {...this.data, text: {_class: 'StyledText', string: e.target.value.trim()}}
  }

  handleType(e) {
    this.data = {...this.data, type: {_class: 'NoteType', string: e.target.value}}
  }

  handlePrivate(e) {
    this.data = {...this.data, private: e.target.checked}
  }

  _reset() {
    const text = this.shadowRoot.getElementById('note-text')
    text.value = ''
    const noteType = this.shadowRoot.getElementById('note-type')
    const defaultTypes = this.defaultTypes?.note_types || []
    const customTypes = this.customTypes?.note_types || []
    const types = defaultTypes.concat(customTypes)
    const defaultTypesLocale = this.defaultTypesLocale?.note_types || []
    const customTypesLocale = this.customTypesLocale?.note_types || []
    const typesLocale = defaultTypesLocale.concat(customTypesLocale)
    const ind = types.indexOf('General')
    noteType.value = ind === -1 ? null : typesLocale[ind]
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
  }


}


window.customElements.define('grampsjs-view-new-note', GrampsjsViewNewNote)
