/*
Form for editing an attribute
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditAttribute extends GrampsjsObjectForm {
  static get properties() {
    return {
      attributeCategory: {type: String},
    }
  }

  constructor() {
    super()
    this.attributeCategory = ''
  }

  renderForm() {
    return html`
      <grampsjs-form-select-type
        noheading
        required
        ?loadingTypes=${this.loadingTypes}
        typeName="${this.#typeNameDefault}"
        typeNameCustom="${this.#typeNameCustom}"
        id="${this.source ? 'srcattrtype' : 'attrtype'}"
        label="${this._('Type')}"
        value=${this.data?.type ?? ''}
        .appState="${this.appState}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
      <grampsjs-form-string
        required
        fullwidth
        id="attrvalue"
        @formdata:changed="${this._handleFormData}"
        label="${this._('Value')}"
        .appState="${this.appState}"
        .data="${this.data}"
        value="${this.data?.value || ''}"
      >
      </grampsjs-form-string>
    `
  }

  get #typeNameDefault() {
    return (
      {
        sources: 'source_attribute_types',
      }[this.attributeCategory.toLowerCase()] || 'attribute_types'
    )
  }

  get #typeNameCustom() {
    return (
      {
        events: 'event_attribute_types',
        families: 'family_attribute_types',
        'media objects': 'media_attribute_types',
        people: 'person_attribute_types',
        sources: 'source_attribute_types',
      }[this.attributeCategory] || 'attribute_types'
    )
  }
}

window.customElements.define(
  'grampsjs-form-edit-attribute',
  GrampsjsFormEditAttribute
)
