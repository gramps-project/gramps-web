/*
Input for one parameter of a condition in the condition builder,
chosen by the parameter type from the rule catalogue (see filterBuilder.js)
*/

import {LitElement, css, html, nothing} from 'lit'
import '@material/web/checkbox/checkbox'
import '@material/web/select/outlined-select'
import '@material/web/select/select-option'
import '@material/web/textfield/outlined-text-field'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, objectTypeToEndpoint} from '../util.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'

// Object types whose select button has a fitting label of its own
const SELECT_LABELLED_TYPES = ['person', 'place', 'source', 'media', 'note']

export class GrampsjsFilterParam extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        md-outlined-text-field,
        md-outlined-select {
          width: 100%;
          --md-outlined-text-field-container-shape: 8px;
          --md-outlined-select-text-field-container-shape: 8px;
        }

        label.checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
        }

        grampsjs-form-select-type {
          --md-filled-select-text-field-container-shape: 8px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      label: {type: String},
      value: {type: String},
      // parameter type, see filterBuilder.js
      paramType: {type: Object},
      // data of /api/types/, for parameters of a Gramps type
      grampsTypes: {type: Object},
      // names of the tags of the tree
      tags: {type: Array},
      required: {type: Boolean},
      // the object of an ID parameter
      _object: {state: true},
      // the ID whose object is being fetched
      _loadingId: {state: true},
    }
  }

  constructor() {
    super()
    this.label = ''
    this.value = ''
    this.paramType = {type: 'text'}
    this.grampsTypes = {}
    this.tags = []
    this.required = false
    this._object = null
    this._loadingId = ''
  }

  render() {
    switch (this.paramType.type) {
      case 'boolean':
        return this._renderBoolean()
      case 'select':
        return this._renderSelect(
          this.paramType.options.map(option => ({
            value: option.value,
            label: this._(option.label),
          }))
        )
      case 'tag':
        return this._renderSelect(
          this.tags.map(tag => ({value: tag, label: tag})),
          true
        )
      case 'gramps_type':
        return this._renderGrampsType()
      case 'id':
        return this._renderId()
      case 'integer':
        return this._renderTextField('number')
      // dates are Gramps date strings such as "between 1800 and 1850",
      // which date inputs can't hold
      default:
        return this._renderTextField('text')
    }
  }

  get _label() {
    return this.label.replace(/:\s*$/, '')
  }

  _renderTextField(type) {
    return html`
      <md-outlined-text-field
        type="${type}"
        label="${this._label}"
        .value="${this.value}"
        min="${this.paramType.min ?? ''}"
        max="${this.paramType.max ?? ''}"
        ?required="${this.required}"
        @input="${e => this._change(e.target.value)}"
      ></md-outlined-text-field>
    `
  }

  _renderBoolean() {
    return html`
      <label class="checkbox">
        <md-checkbox
          .checked="${this.value === '1'}"
          @change="${e => this._change(e.target.checked ? '1' : '0')}"
        ></md-checkbox>
        <span>${this._label}</span>
      </label>
    `
  }

  _renderSelect(options, withEmpty = false) {
    return html`
      <md-outlined-select
        label="${this._label}"
        .value="${this.value}"
        @change="${e => this._change(e.target.value)}"
      >
        ${withEmpty
          ? html`<md-select-option value="">
              <div slot="headline"></div>
            </md-select-option>`
          : ''}
        ${options.map(
          option => html`
            <md-select-option
              value="${option.value}"
              ?selected="${option.value === this.value}"
            >
              <div slot="headline">${option.label}</div>
            </md-select-option>
          `
        )}
      </md-outlined-select>
    `
  }

  _renderGrampsType() {
    return html`
      <grampsjs-form-select-type
        noheading
        nocustom
        label="${this._label}"
        defaultValue=""
        .appState="${this.appState}"
        typeName="${this.paramType.default_types}"
        typeNameCustom="${this.paramType.custom_types}"
        .value="${this.value}"
        .types="${this.grampsTypes}"
        @formdata:changed="${this._handleTypeChange}"
      ></grampsjs-form-select-type>
    `
  }

  get _objectType() {
    return (this.paramType.namespace ?? '').toLowerCase()
  }

  // The object selector of the app's forms: a select button, and the
  // selected object as a list row
  _renderId() {
    if (this.value && this._loadingId === this.value) {
      // the selector takes its initial object on creation only
      return nothing
    }
    const objectType = this._objectType
    const object =
      this._object?.gramps_id === this.value && !this._object.missing
        ? this._object
        : null
    return html`
      <grampsjs-form-select-object-list
        objectType="${objectType}"
        label="${SELECT_LABELLED_TYPES.includes(objectType)
          ? ''
          : this._('Select')}"
        .objectsInitial="${object
          ? [{object_type: objectType, handle: object.handle, object}]
          : []}"
        .appState="${this.appState}"
        @select-object:changed="${this._handleObjectsChanged}"
        @object-list:changed="${this._handleObjectsChanged}"
      ></grampsjs-form-select-object-list>
    `
  }

  updated(changed) {
    if (
      this.paramType.type === 'id' &&
      this.value &&
      this.value !== this._object?.gramps_id &&
      this.value !== this._loadingId
    ) {
      this._fetchObject()
    }
    super.updated(changed)
  }

  // Looks up the object of the ID to show it in the selector
  async _fetchObject() {
    const grampsId = this.value
    const endpoint = objectTypeToEndpoint[this._objectType]
    if (!endpoint) {
      return
    }
    this._loadingId = grampsId
    const data = await this.appState.apiGet(
      `/api/${endpoint}/?gramps_id=${encodeURIComponent(
        grampsId
      )}&extend=all&profile=all&locale=${this.appState.i18n.lang || 'en'}`
    )
    if (this.value !== grampsId) {
      return
    }
    // an unknown ID leaves the selector empty
    this._object = data?.data?.[0] ?? {gramps_id: grampsId, missing: true}
    this._loadingId = ''
  }

  _handleObjectsChanged(e) {
    e.stopPropagation()
    const obj = e.detail.objects[0]?.object ?? null
    this._object = obj
    this._change(obj?.gramps_id ?? '')
  }

  _handleTypeChange(e) {
    e.stopPropagation()
    this._change(e.detail.data ?? '')
  }

  _change(value) {
    this.value = value
    fireEvent(this, 'filter-param:change', {value})
  }
}

window.customElements.define('grampsjs-filter-param', GrampsjsFilterParam)
