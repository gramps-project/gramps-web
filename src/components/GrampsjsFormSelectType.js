/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'


class GrampsjsFormSelectType extends LitElement {
  static get styles() {
    return [
      sharedStyles
    ]
  }


  static get properties() {
    return {
      strings: {type: Object},
      typeName: {type: String},
      defaultTypeName: {type: String},
      types: {type: Object},
      typesLocale: {type: Object},
      disabled: {type: Boolean},
      loadingTypes: {type: Boolean},
      required: {type: Boolean}
    }
  }


  constructor() {
    super()
    this.types = {}
    this.typesLocale = {}
    this.disabled = false
    this.typeName = ''
    this.defaultTypeName = 'General'
    this.loadingTypes = false
    this.required = false
  }

  getTypes(types) {
    const defaultTypesAll = types?.default || {}
    const customTypesAll = types?.custom || {}
    const defaultTypes = this.typeName in defaultTypesAll ? defaultTypesAll[this.typeName] : []
    const customTypes = this.typeName in customTypesAll ? customTypesAll[this.typeName] : []
    return defaultTypes.concat(customTypes)
  }

  render() {
    const types = this.getTypes(this.types)
    const typesLocale = this.getTypes(this.typesLocale)
    return html`
    <h4 class="label">${this._('Type')}</h4>
    <p>
      <mwc-select
        style="width:100%"
        ?required="${this.required}"
        validationMessage="${this._('This field is mandatory')}"
        @change="${this.handleChange}"
        ?disabled="${this.disabled}"
        label="${this.loadingTypes ? this._('Loading items...') : ''}"
        id="select-type"
      >
        ${types.includes(this.defaultTypeName) ? '' : html`<mwc-list-item value="" selected></mwc-list-item>`}
        ${this.loadingTypes ? '' : types.map((obj, i) => html`
          <mwc-list-item
            value="${typesLocale[i]}"
            ?selected="${obj === this.defaultTypeName}"
          >${this._(obj)}</mwc-list-item>
          `)}
      </mwc-select>
    </p>
`
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
    this.dispatchEvent(new CustomEvent('formdata:changed', {bubbles: true, composed: true, detail: {data}}))
  }

  isValid() {
    const selectType = this.shadowRoot.getElementById('select-type')
    if (selectType === null) {
      return false
    }
    try {
      return selectType?.validity?.valid
    } catch {
      return false
    }
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

window.customElements.define('grampsjs-form-select-type', GrampsjsFormSelectType)
