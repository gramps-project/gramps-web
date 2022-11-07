/*
Element for selecting a Gramps type
*/

import { html, LitElement } from 'lit'
import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'

import { sharedStyles } from '../SharedStyles.js'
import { GrampsjsTranslateMixin } from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsFormSelectType extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [sharedStyles]
  }

  static get properties() {
    return {
      heading: {type: String},
      label: {type: String},
      typeName: {type: String},
      defaultTypeName: {type: String},
      types: {type: Object},
      typesLocale: {type: Object},
      disabled: {type: Boolean},
      loadingTypes: {type: Boolean},
      required: {type: Boolean},
      initialValue: {type: String},
      noheading: {type: Boolean},
      _hasCustomType: {type: Boolean} //adding _hasCustomType prop
    }
  }

  constructor() {
    super()
    this.types = {}
    this.typesLocale = {}
    this.disabled = false
    this.typeName = ''
    this.heading = ''
    this.label = ''
    this.defaultTypeName = 'General'
    this.loadingTypes = false
    this.required = false
    this.initialValue = ''
    this.noheading = false
    this._hasCustomType = false //this will be false as no custom type is entered initially
  }

  getTypes(types) {
    const defaultTypesAll = types?.default || {}
    const customTypesAll = types?.custom || {}
    const defaultTypes =
      this.typeName in defaultTypesAll ? defaultTypesAll[this.typeName] : []
    const customTypes =
      this.typeName in customTypesAll ? customTypesAll[this.typeName] : []
    return defaultTypes.concat(customTypes)
  }

  render() {
    const types = this.getTypes(this.types)
    const typesLocale = this.getTypes(this.typesLocale)
    return html`
      ${this.noheading
        ? ''
        : html`<h4 class="label">${this.heading || this._('Type')}</h4>`}
      <p>
        <mwc-select
          style="width:100%"
          ?required=${!this._hasCustomType}
          ?disabled=${this._hasCustomType}
          validationMessage="${this._('This field is mandatory')}"
          @change="${this.handleChange}"
          ?disabled="${this.disabled}"
          label="${this.loadingTypes ? this._('Loading items...') : this.label}"
          id="select-type"
        >
          ${types.includes(this.defaultTypeName) ||
        types.includes(this.initialValue)
        ? ''
        : html`<mwc-list-item value="" selected></mwc-list-item>`}
          ${this.loadingTypes
        ? ''
        : types.map(
          (obj, i) => html`
                  <mwc-list-item
                    value="${typesLocale[i]}"
                    ?selected="${(this.initialValue &&
              obj === this.initialValue) ||
            obj === this.defaultTypeName}"
                    >${this._(obj)}</mwc-list-item
                  >
                `
        )}
        </mwc-select>
      </p>

      <mwc-button
        @click="${this.switchTypeInput}"
      >
        ${this._('Switch to custom type')}
      </mwc-button>

  ${!this._hasCustomType
        ? html``
        : html`
          <h4 class="label">${this._('Custom Type')}</h4>
          <p>
          <mwc-textfield
            style="width:100%"
            ?required=${this._hasCustomType}
            validationMessage="${this._('This field is mandatory')}"
            @change="${this.handleChange}"
            id="custom-type"
          >
          </mwc-textfield>
          </p>
        `
      }
`
  }

  switchTypeInput() {
    this._hasCustomType = true
  }

  reset() {
    const types = this.getTypes(this.types)
    const typesLocale = this.getTypes(this.typesLocale)
    const ind = types.indexOf('General')
    const selectType = this.shadowRoot.getElementById('select-type')
    selectType.value = ind === -1 ? null : typesLocale[ind]
  }

  handleChange(e) {
    const data = e.target.value
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: { data },
      })
    )
  }

  isValid() {
    const selectType = this.shadowRoot.getElementById('select-type')
    const customType = this.shadowRoot.getElementById('custom-type') //adding query for custom-type id
    if (selectType === null && customType === null) { //checking if both types null then return false
      return false
    }
    try {
      return selectType?.validity?.valid
    } catch {
      return false
    }
  }
}

window.customElements.define(
  'grampsjs-form-select-type',
  GrampsjsFormSelectType
)
