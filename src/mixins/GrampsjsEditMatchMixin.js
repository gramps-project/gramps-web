import {html} from 'lit'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'

import '../components/GrampsjsConnectedDnaMatchTable.js'
import '../components/GrampsjsTooltip.js'
import {fireEvent} from '../util.js'

export const GrampsjsEditMatchMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        data: {type: Object},
        isFormValid: {type: Boolean},
        _parsedDataOk: {type: Boolean},
      }
    }

    constructor() {
      super()
      this.data = {}
      this.isFormValid = false
      this._parsedDataOk = false
    }

    renderEditor() {
      return html`
        <h4 class="label">${this._('Raw match data')}</h4>
        <p>
          <md-outlined-text-field
            type="textarea"
            rows="5"
            id="match-data"
            placeholder="${this._('Paste text or drop a file here')}"
            @input="${this._handleRawData}"
            value="${this.data.raw_data?.[0] || ''}"
            @dragenter="${this._handleDragEnter}"
            @dragleave="${this._handleDragLeave}"
            @drop="${this._handleDrop}"
          >
          </md-outlined-text-field>
        </p>
      `
    }

    _handleDragEnter(e) {
      e.preventDefault()
      const textField = this.shadowRoot.querySelector('#match-data')
      if (textField) {
        textField.classList.add('drag-hover')
      }
    }

    _handleDragLeave(e) {
      e.preventDefault()
      this._handleRemoveDragHover()
    }

    _handleRemoveDragHover() {
      const textField = this.shadowRoot.querySelector('#match-data')
      if (textField) {
        textField.classList.remove('drag-hover')
      }
    }

    _handleDrop(e) {
      e.preventDefault()
      this._handleRemoveDragHover()
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        const reader = new FileReader()
        reader.onload = event => {
          this.data.raw_data = [event.target.result]
          this.requestUpdate()
        }
        reader.readAsText(file)
        reader.onloadend = () => {
          const textField = this.shadowRoot.querySelector('#match-data')
          if (textField) {
            textField.value += this.data.raw_data[0]
            fireEvent(textField, 'input')
          }
        }
      } else if (e.dataTransfer.items.length > 0) {
        const text = e.dataTransfer.getData('text')
        if (text) {
          this.data.raw_data = [text]
          this.requestUpdate()
          const textField = this.shadowRoot.querySelector('#match-data')
          if (textField) {
            textField.value += text
            fireEvent(textField, 'input')
          }
        }
      }
    }

    renderPreview() {
      return html` <h4 class="label">${this._('Preview')}</h4>
        ${this.data.raw_data?.[0]
          ? html`
              <grampsjs-connected-dna-match-table
                .postData="${{string: this.data.raw_data?.[0]}}"
                .strings="${this.strings}"
                @connected-component:updated="${e =>
                  this._handleMatchTableUpdated(e)}"
              ></grampsjs-connected-dna-match-table>
            `
          : html`<p>
              ${this._(
                'Paste the raw data in the field above to see the preview.'
              )}
            </p>`}`
    }

    _handleMatchTableUpdated(event) {
      const data = event.detail?.data?.data
      if (data && data.length) {
        this._parsedDataOk = true
      } else {
        this._parsedDataOk = false
      }
      this.checkFormValidity()
    }

    checkFormValidity() {
      this.isFormValid =
        this.data.source_handle &&
        this.data.target_handle &&
        this.data.source_handle !== this.data.target_handle &&
        this.data.raw_data?.[0] &&
        this._parsedDataOk
    }

    _handleRawData() {
      const el = this.shadowRoot.querySelector('md-outlined-text-field')
      if (el !== null) {
        fireEvent(el, 'formdata:changed', {data: el.value.trim()})
      }
    }
  }
