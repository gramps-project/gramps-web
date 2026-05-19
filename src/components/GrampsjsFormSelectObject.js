/*
Element for selecting a Gramps object
*/

import {html, css, LitElement} from 'lit'

import '@material/web/button/outlined-button.js'

import {mdiLinkPlus} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import {fireEvent} from '../util.js'
import './GrampsjsObjectPickerDialog.js'
import './GrampsjsIcon.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

// labels for button
const btnLabel = {
  person: 'Select an existing person',
  place: 'Select an existing place',
  source: 'Select an existing source',
  media: 'Select an existing media object',
  event: 'Share an existing event',
  note: 'Select an existing note',
}

class GrampsjsFormSelectObject extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [sharedStyles, css``]
  }

  static get properties() {
    return {
      objectType: {type: String},
      objects: {type: Array},
      multiple: {type: Boolean},
      label: {type: String},
      disabled: {type: Boolean},
      hideButton: {type: Boolean},
      initialQuery: {type: String},
      iconPath: {type: String},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.objects = []
    this.multiple = false
    this.label = ''
    this.disabled = false
    this.hideButton = false
    this.initialQuery = ''
    this.iconPath = mdiLinkPlus
  }

  render() {
    return html`
      <md-outlined-button
        ?disabled="${this.disabled}"
        style="${this.hideButton ? 'display:none;' : ''}"
        @click="${this._handleBtnClick}"
      >
        <grampsjs-icon
          slot="icon"
          path="${this.iconPath}"
          color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
        ></grampsjs-icon>
        ${this.label || this._(btnLabel[this.objectType]) || this._('Select')}
      </md-outlined-button>

      <grampsjs-object-picker-dialog
        objectType="${this.objectType}"
        .excludeHandles="${this._handleList()}"
        .appState="${this.appState}"
        @select-object:selected="${this._handleSelected}"
      ></grampsjs-object-picker-dialog>
    `
  }

  reset() {
    this.objects = []
  }

  _handleList() {
    return this.objects.map(_obj => _obj.object?.handle).filter(Boolean)
  }

  _handleSelected(e) {
    const obj = e.detail
    if (!this.multiple) {
      this.objects = [obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    } else if (!this._handleList().includes(obj.object?.handle)) {
      this.objects = [...this.objects, obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    }
  }

  open() {
    this.renderRoot.querySelector('grampsjs-object-picker-dialog')?.open()
  }

  _handleBtnClick() {
    const query = this.initialQuery
    this.initialQuery = ''
    this.renderRoot.querySelector('grampsjs-object-picker-dialog')?.open(query)
  }
}

window.customElements.define(
  'grampsjs-form-select-object',
  GrampsjsFormSelectObject
)
