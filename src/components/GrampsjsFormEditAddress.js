/*
Form for editing an address
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectDate.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {emptyDate} from '../util.js'

// The address properties edited as plain strings, in display order, with the
// label used for each. The form field ids are these keys prefixed with
// `address-` to keep them clear of the ids handled by the base form.
const stringFields = {
  street: 'Street',
  locality: 'Locality',
  city: 'City',
  county: 'County',
  state: 'State',
  postal: 'Postal Code',
  country: 'Country',
  phone: 'Phone',
}

class GrampsjsFormEditAddress extends GrampsjsObjectForm {
  renderForm() {
    return html`
      ${Object.entries(stringFields).map(
        ([key, label]) => html`
          <p>
            <grampsjs-form-string
              fullwidth
              id="address-${key}"
              @formdata:changed="${this._handleFormData}"
              label="${this._(label)}"
              .appState="${this.appState}"
              value="${this.data?.[key] || ''}"
            >
            </grampsjs-form-string>
          </p>
        `
      )}
      <h4 class="label">${this._('Date')}</h4>
      <p>
        <grampsjs-form-select-date
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="address-date"
          .data="${this.data?.date ?? emptyDate}"
          .appState="${this.appState}"
        >
        </grampsjs-form-select-date>
      </p>
    `
  }

  get isValid() {
    const hasContent = Object.keys(stringFields).some(key => this.data?.[key])
    return hasContent && this._areDateSelectValid()
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'address-date') {
      this.data = {...this.data, date: e.detail.data ?? emptyDate}
    } else if (originalTarget.id.startsWith('address-')) {
      const key = originalTarget.id.slice('address-'.length)
      if (key in stringFields) {
        this.data = {...this.data, [key]: e.detail.data}
      }
    }
    super._handleFormData(e)
  }
}

window.customElements.define(
  'grampsjs-form-edit-address',
  GrampsjsFormEditAddress
)
