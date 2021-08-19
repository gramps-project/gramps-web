import {html, css} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textarea'
import '@material/mwc-switch'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, apiPost} from '../api.js'


export class GrampsjsViewNewNote extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }

      h4.label {
        font-size: 18px;
        font-family: Roboto;
        font-weight: 300;
      }

      div.spacer {
        margin-top: 2em;
      }

      p.right {
        text-align: right;
      }

      `]
  }


  static get properties() {
    return {
      data: {type: Object},
      types: {type: Array},
      typesLocale: {type: Array},
      loadingTypes: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
    this.types = []
    this.typesLocale = []
    this.loadingTypes = false
  }

  render() {
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
          ${this.loadingTypes ? '' : this.types.map((obj, i) => html`
          <mwc-list-item value="${this.typesLocale[i]}" ?selected="${obj === 'General'}">${this._(obj)}</mwc-list-item>
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

  update(changed) {
    super.update(changed)
    if (changed.has('active')) {
      this._updateData()
    }
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
    const ind = this.types.indexOf('General')
    noteType.value = ind === -1 ? null : this.typesLocale[ind]
    this.data = {_class: 'Note', text: {_class: 'StyledText', string: ''}}
  }

  _submit() {
    apiPost('/api/notes/', this.data).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data[0]?.new?.gramps_id
        this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `note/${grampsId}`
  }

  _updateData() {
    this.loading = true
    this.loadingTypes = true
    apiGet('/api/types/').then(data => {
      this.loading = false
      if ('data' in data) {
        const defaultTypes = data.data?.default?.note_types || []
        const customTypes = data.data?.custom?.note_types || []
        this.types = defaultTypes.concat(customTypes)
        this.error = false
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    }).then(() => {
      this.loading = true
      apiGet('/api/types/?locale=1').then(data => {
        this.loading = false
        this.loadingTypes = false
        if ('data' in data) {
          const defaultTypes = data.data?.default?.note_types || []
          const customTypes = data.data?.custom?.note_types || []
          this.typesLocale = defaultTypes.concat(customTypes)
          this.error = false
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    })
  }

}


window.customElements.define('grampsjs-view-new-note', GrampsjsViewNewNote)
