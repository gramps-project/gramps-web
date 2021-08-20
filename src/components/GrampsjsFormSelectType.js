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
      sharedStyles,
      css`
      `
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
        @change="${this.handleChange}"
        ?disabled="${this.disabled}"
        label="${this.loadingTypes ? this._('Loading items...') : ''}"
        id="note-type"
      >
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
    const noteType = this.shadowRoot.getElementById('note-type')
    noteType.value = ind === -1 ? null : typesLocale[ind]
  }

  handleChange(e) {
    const data = e.target.value
    this.dispatchEvent(new CustomEvent('formdata:changed', {bubbles: true, composed: true, detail: {data}}))
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

window.customElements.define('grampsjs-form-select-type', GrampsjsFormSelectType)
