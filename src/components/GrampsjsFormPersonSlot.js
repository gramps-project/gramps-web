import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {dateIsEmpty, fireEvent} from '../util.js'
import './GrampsjsPillToggle.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'

const personDataDefault = {_class: 'Person', gender: 2, citation_list: []}

// Provides the terminal _handleFormData implementation that GrampsjsNewPersonMixin
// calls via super. Handles the private, citation, and rel-type fields that the
// person mixin doesn't cover.
class _PersonSlotBase extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .rel-types {
          display: flex;
          gap: 1em;
          flex-wrap: wrap;
        }

        .rel-types > * {
          flex: 1;
          min-width: 12em;
        }
      `,
    ]
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
    if (originalTarget.id === 'object-citation-list') {
      this.data = {...this.data, citation_list: e.detail.data ?? []}
    }
  }

  // Stub so GrampsjsNewPersonMixin.renderForm() doesn't throw when tags mixin
  // is not in the chain.
  // eslint-disable-next-line class-methods-use-this
  _renderTagsForm() {
    return ''
  }
}

export class GrampsjsFormPersonSlot extends GrampsjsNewPersonMixin(
  _PersonSlotBase
) {
  static get properties() {
    return {
      role: {type: String},
      showRelTypes: {type: Boolean},
      types: {type: Object},
      typesLocale: {type: Object},
      loadingTypes: {type: Boolean},
      _mode: {type: String, state: true},
      _selectedHandles: {type: Array, state: true},
      _frel: {type: Object, state: true},
      _mrel: {type: Object, state: true},
    }
  }

  constructor() {
    super()
    this.role = ''
    this.showRelTypes = false
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this._mode = 'select'
    this._selectedHandles = []
    this._frel = null
    this._mrel = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandleFormData = this._handleFormData.bind(this)
    this.addEventListener('formdata:changed', this._boundHandleFormData)
  }

  disconnectedCallback() {
    this.removeEventListener('formdata:changed', this._boundHandleFormData)
    super.disconnectedCallback()
  }

  render() {
    return html`
      <grampsjs-pill-toggle
        .options="${[
          {value: 'select', label: this._('Existing Person')},
          {value: 'create', label: this._('New Person')},
        ]}"
        .selected="${this._mode}"
        @pill-toggle:change="${e => this._setMode(e.detail.value)}"
      ></grampsjs-pill-toggle>
      ${this._mode === 'select'
        ? this._renderSelectMode()
        : this._renderCreateMode()}
    `
  }

  _renderSelectMode() {
    return html`
      <grampsjs-form-select-object-list
        id="person-in-slot"
        objectType="person"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
      ${this.showRelTypes ? this._renderRelTypes() : ''}
    `
  }

  _renderCreateMode() {
    return html`
      ${this.renderForm()} ${this.showRelTypes ? this._renderRelTypes() : ''}
    `
  }

  _renderRelTypes() {
    return html`
      <div class="rel-types">
        <grampsjs-form-select-type
          required
          id="child-frel"
          heading="${this._('Relationship to _Father:').replace(':', '')}"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="child_reference_types"
          defaultValue="Birth"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        ></grampsjs-form-select-type>
        <grampsjs-form-select-type
          required
          id="child-mrel"
          heading="${this._('Relationship to _Mother:').replace(':', '')}"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="child_reference_types"
          defaultValue="Birth"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        ></grampsjs-form-select-type>
      </div>
    `
  }

  translateTypeName(isCustom, typeKey, string) {
    const types =
      (this.types[isCustom ? 'custom' : 'default'] || {})[typeKey] || []
    const ind = types.indexOf(string)
    try {
      return this.typesLocale[isCustom ? 'custom' : 'default'][typeKey][ind]
    } catch {
      return string
    }
  }

  _setMode(mode) {
    if (mode === this._mode) return
    this._mode = mode
    this._selectedHandles = []
    this.data = {...personDataDefault}
  }

  _handleFormData(e) {
    // Re-dispatched slot-level pings are for the parent's benefit only.
    if (e.composedPath()[0] === this) return
    // Stop the original shadow-internal event here so its generic ids
    // (e.g. 'private', 'object-citation-list') cannot collide with identically
    // named fields on ancestor forms.
    e.stopPropagation()
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'person-in-slot-list') {
      this._selectedHandles = e.detail.data ?? []
    }
    if (originalTarget.id === 'child-frel') {
      this._frel = e.detail.data
    }
    if (originalTarget.id === 'child-mrel') {
      this._mrel = e.detail.data
    }
    // Re-dispatch from the slot element so ancestors can recheck validity.
    // composedPath()[0] will be the slot itself, whose id never matches any
    // ancestor form field.
    fireEvent(this, 'formdata:changed', {})
  }

  // Returns the slot's data at submit time. Called once by the parent view.
  getData() {
    if (this._mode === 'select') {
      if (!this._selectedHandles.length) return null
      return {
        handle: this._selectedHandles[0],
        frel: this._frel,
        mrel: this._mrel,
      }
    }
    // Treat a create-mode slot with no name, birth, or death as empty.
    const {birth = {}, death = {}} = this.data
    const hasBirth = birth.place || (birth.date && !dateIsEmpty(birth.date))
    const hasDeath = death.place || (death.date && !dateIsEmpty(death.date))
    if (!this.data.primary_name && !hasBirth && !hasDeath) return null
    return {
      newPersonData: this._processedData(),
      frel: this._frel,
      mrel: this._mrel,
    }
  }

  isEmpty() {
    if (this._mode === 'select') return this._selectedHandles.length === 0
    const {birth = {}, death = {}} = this.data
    const hasBirth = birth.place || (birth.date && !dateIsEmpty(birth.date))
    const hasDeath = death.place || (death.date && !dateIsEmpty(death.date))
    return !this.data.primary_name && !hasBirth && !hasDeath
  }

  // Called by the parent view to check whether inline forms are valid.
  checkValidity() {
    if (this._mode === 'select') return true
    this.checkFormValidity()
    return this.isFormValid
  }

  reset() {
    this._mode = 'select'
    this._selectedHandles = []
    this._frel = null
    this._mrel = null
    this.data = {...personDataDefault}
    if (this.shadowRoot) {
      this.shadowRoot
        .querySelectorAll(
          [
            'grampsjs-form-select-type',
            'grampsjs-form-private',
            'grampsjs-form-object-list',
            'grampsjs-form-select-object',
            'grampsjs-form-select-object-list',
            'grampsjs-form-select-date',
            'grampsjs-form-name',
          ].join(', ')
        )
        .forEach(el => el.reset())
    }
  }
}

window.customElements.define(
  'grampsjs-form-person-slot',
  GrampsjsFormPersonSlot
)
