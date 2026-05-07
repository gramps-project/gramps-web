import {html} from 'lit'
import '@material/web/textfield/outlined-text-field.js'

import {fireEvent} from '../util.js'

export const GrampsjsEditYDnaMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        data: {type: Object},
        isFormValid: {type: Boolean},
      }
    }

    constructor() {
      super()
      this.data = {}
      this.isFormValid = false
    }

    renderEditor() {
      return html`
        <h4 class="label">${this._('Raw SNP data')}</h4>
        <p>
          <md-outlined-text-field
            type="textarea"
            rows="8"
            id="ydna-data"
            @input="${this._handleRawData}"
            value="${this.data.raw_data || ''}"
          >
          </md-outlined-text-field>
        </p>
      `
    }

    _handleRawData() {
      const el = this.shadowRoot.querySelector('#ydna-data')
      if (el !== null) {
        this.data = {...this.data, raw_data: el.value.trim()}
        this.checkFormValidity()
        fireEvent(el, 'formdata:changed', {data: el.value.trim()})
      }
    }

    checkFormValidity() {
      const dataField = this.shadowRoot?.querySelector('#ydna-data')
      const hasData = dataField?.value?.trim()
      this.isFormValid = !!hasData
    }

    getRawData() {
      const dataField = this.shadowRoot?.querySelector('#ydna-data')
      return dataField?.value?.trim() || ''
    }

    reset() {
      this.data = {}
      this.isFormValid = false

      const dataField = this.shadowRoot?.querySelector('#ydna-data')
      if (dataField) {
        dataField.value = ''
      }
    }
  }
