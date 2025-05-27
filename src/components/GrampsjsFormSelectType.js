/*
Element for selecting a Gramps type
*/

import {css, html, LitElement} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/filled-text-field.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

class GrampsjsFormSelectType extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hide {
          display: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      disabled: {type: Boolean},
      loadingTypes: {type: Boolean},
      nocustom: {type: Boolean},
      noheading: {type: Boolean},
      required: {type: Boolean},
      valueNonLocal: {type: Boolean},
      defaultValue: {type: String},
      heading: {type: String},
      label: {type: String},
      typeName: {type: String},
      typeNameCustom: {type: String},
      types: {type: Object},
      typesLocale: {type: Object},
      value: {type: String},
      _hasCustomType: {type: Boolean},
      _touched: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.disabled = false
    this.loadingTypes = false
    this.nocustom = false
    this.noheading = false
    this.required = false
    this.valueNonLocal = false
    this.defaultValue = 'General'
    this.heading = ''
    this.label = ''
    this.typeName = ''
    this.typeNameCustom = ''
    this.types = {}
    this.typesLocale = {}
    this.value = ''
    this._hasCustomType = false
    this._touched = false
  }

  updated(changed) {
    if (changed.has('types')) {
      const types = this.getTypes()
      if (
        Array.isArray(types) &&
        !types.includes(this.value) &&
        types.includes(this.defaultValue)
      ) {
        this.value = this.defaultValue
      }
    }
  }

  isValid() {
    return !this.required || this.value
  }

  render() {
    return html`
      ${this.noheading ? '' : this.#renderHeading()}
      <p style="display: flex">
        ${this.loadingTypes ? this.#renderLoading() : this.#renderInputs()}
        ${this.nocustom ? '' : this.#renderCustomSwitch()}
      </p>
    `
  }

  #renderHeading() {
    return html`<h4 class="label">${this.heading || this._('Type')}</h4>`
  }

  #renderLoading() {
    return html`
      <md-filled-select
        style="width:100%"
        label="${this._('Loading items...')}"
        disabled
      ></md-filled-select>
    `
  }

  #renderInputs() {
    return html`
      ${!this._hasCustomType
        ? html`
            <md-filled-select
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @change="${this.#handleSelectChange}"
              @closing="${this.#handleSelectClosing}"
              label="${this.label}"
              .value="${this.value}"
              id="select-type"
            >
              <md-select-option value="">
                <div slot="headline"></div>
              </md-select-option>
              ${this.getTypes().map(
                (obj, i) => html`
                  <md-select-option
                    value="${this.getTypes(this.valueNonLocal)[i]}"
                  >
                    <div slot="headline">${this._(obj)}</div>
                  </md-select-option>
                `
              )}
            </md-filled-select>
          `
        : html`
            <md-filled-text-field
              style="width:100%"
              ?disabled="${this.disabled}"
              ?error="${this.#error}"
              error-text="${this._('This field is mandatory')}"
              @input="${this.#handleTextFieldInput}"
              @blur="${this.#handleTextFieldBlur}"
              label="${this.label} ${this._('Custom')}"
              .value="${this.value}"
              id="custom-type"
            >
            </md-filled-text-field>
          `}
    `
  }

  #renderCustomSwitch() {
    return html`
      <mwc-icon-button
        style="margin-left: 8px"
        icon="${this._hasCustomType ? 'remove' : 'add'}"
        id="button-switch-type"
        @click="${this.#toggleCustomType}"
        ?disabled="${this.disabled || this.loadingTypes}"
      ></mwc-icon-button>
      <grampsjs-tooltip
        for="button-switch-type"
        content="${this._hasCustomType
          ? this._('Switch to default type')
          : this._('Add custom type')}"
        .appState="${this.appState}"
      ></grampsjs-tooltip>
    `
  }

  getTypes(nonLocal = true) {
    const types = nonLocal ? this.types : this.typesLocale
    const defaultTypesAll = types?.default || {}
    const customTypesAll = types?.custom || {}
    const defaultTypes =
      this.typeName in defaultTypesAll ? defaultTypesAll[this.typeName] : []
    const customTypes =
      this.typeNameCustom || this.typeName in customTypesAll
        ? customTypesAll[this.typeNameCustom || this.typeName]
        : []
    return defaultTypes.concat(customTypes)
  }

  #toggleCustomType() {
    this._hasCustomType = !this._hasCustomType
    if (this._hasCustomType) {
      this._touched = false
    }
    this.#setValue('')
  }

  #handleSelectChange(e) {
    this.#setValue(e.target.value)
  }

  #handleSelectClosing() {
    this._touched = true
  }

  #handleTextFieldInput(e) {
    this.#setValue(e.target.value)
  }

  #handleTextFieldBlur() {
    this._touched = true
  }

  #setValue(value) {
    this.value = value
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data: value},
      })
    )
  }

  get #error() {
    return this._touched && !this.isValid()
  }
}

window.customElements.define(
  'grampsjs-form-select-type',
  GrampsjsFormSelectType
)
