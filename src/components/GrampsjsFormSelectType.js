/*
Element for selecting a Gramps type
*/

import {css, html, LitElement} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import {classMap} from 'lit/directives/class-map.js'
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
      nocustom: {type: Boolean},
      valueNonLocal: {type: Boolean},
      _hasCustomType: {type: Boolean}, // adding _hasCustomType prop
    }
  }

  constructor() {
    super()
    this.types = {}
    this.typesLocale = {}
    this.typeName = ''
    this.heading = ''
    this.label = ''
    this.defaultTypeName = 'General'
    this.disabled = false
    this.loadingTypes = false
    this.required = false
    this.initialValue = ''
    this.noheading = false
    this.nocustom = false
    this._hasCustomType = false // this will be false as no custom type is entered initially
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
      <p style="display: flex">
        <md-filled-select
          style="width:100%"
          class="${classMap({hide: this._hasCustomType})}"
          ?required=${this.required && !this._hasCustomType && !this.nocustom}
          ?disabled=${this.loadingTypes || this._hasCustomType || this.disabled}
          error-text="${this._('This field is mandatory')}"
          @change="${this.handleChange}"
          label="${this.loadingTypes ? this._('Loading items...') : this.label}"
          id="select-type"
        >
          ${types.includes(this.defaultTypeName) ||
          types.includes(this.initialValue)
            ? ''
            : html`<md-select-option value="" selected
                ><div slot="headline"></div
              ></md-select-option>`}
          ${this.loadingTypes
            ? ''
            : types.map(
                (obj, i) => html`
                  <md-select-option
                    value="${this.valueNonLocal ? types[i] : typesLocale[i]}"
                    ?selected="${(this.initialValue &&
                      obj === this.initialValue) ||
                    (!this.initialValue && obj === this.defaultTypeName)}"
                  >
                    <div slot="headline">${this._(obj)}</div>
                  </md-select-option>
                `
              )}
        </md-filled-select>
        ${this.nocustom || !this._hasCustomType
          ? ''
          : html`
              <mwc-textfield
                ?disabled="${this.disabled}"
                style="width:100%"
                ?required=${this.required}
                validationMessage="${this._('This field is mandatory')}"
                @input="${this.handleChange}"
                label="${this.loadingTypes
                  ? this._('Loading items...')
                  : `${this.label} ${this._('Custom')}`}"
                id="custom-type"
              >
              </mwc-textfield>
            `}
        ${this.nocustom
          ? ''
          : html`
              <mwc-icon-button
                style="margin-left: 8px"
                icon="${this._hasCustomType ? 'remove' : 'add'}"
                id="button-switch-type"
                @click="${this.switchTypeInput}"
                ?disabled="${this.disabled}"
              ></mwc-icon-button>
              <grampsjs-tooltip
                for="button-switch-type"
                content="${this._hasCustomType
                  ? this._('Switch to default type')
                  : this._('Add custom type')}"
                .appState="${this.appState}"
              ></grampsjs-tooltip>
            `}
      </p>
    `
  }

  switchTypeInput() {
    if (!this._hasCustomType) {
      const selectType = this.shadowRoot.getElementById('select-type')
      selectType.value = null
    }
    this._hasCustomType = !this._hasCustomType
  }

  reset() {
    const types = this.getTypes(this.types)
    const typesLocale = this.getTypes(this.typesLocale)
    const ind = types.indexOf('General')
    const selectType = this.shadowRoot.getElementById('select-type')
    const typeInd = this.valueNonLocal ? types[ind] : typesLocale[ind]
    selectType.value = ind === -1 ? null : typeInd
    this._hasCustomType = false
  }

  handleChange(e) {
    const data = e.target.value
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data},
      })
    )
  }

  isValid() {
    const selectType = this.shadowRoot.getElementById('select-type')
    const customType = this.shadowRoot.getElementById('custom-type')
    if (selectType === null || (this._hasCustomType && customType === null)) {
      return false
    }
    try {
      return this._hasCustomType
        ? customType?.validity?.valid
        : selectType?.validity?.valid
    } catch {
      return false
    }
  }
}

window.customElements.define(
  'grampsjs-form-select-type',
  GrampsjsFormSelectType
)
