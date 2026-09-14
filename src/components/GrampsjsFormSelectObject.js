/*
Element for selecting a Gramps object
*/

import {html, css, LitElement} from 'lit'

import '@material/web/button/outlined-button.js'

import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'

import {fireEvent, makeHandle, objectTypeToEndpoint} from '../util.js'
import './GrampsjsObjectPickerDialog.js'
// Circular import: the place form contains object selectors itself. This is
// safe because both sides only use each other's tag names at render time.
import './GrampsjsFormNewPlace.js'
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

// labels for the create button, for the object types that support allowNew
const newBtnLabel = {
  place: 'Add a new place',
}

const newDialogTitle = {
  place: 'New Place',
}

class GrampsjsFormSelectObject extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `,
    ]
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
      allowNew: {type: Boolean},
      _newObjectDialogOpen: {type: Boolean, state: true},
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
    this.allowNew = false
    this._newObjectDialogOpen = false
  }

  render() {
    return html`
      <div class="buttons">
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
        ${this._canCreate()
          ? html`
              <md-outlined-button
                ?disabled="${this.disabled}"
                @click="${this._handleNewBtnClick}"
              >
                <grampsjs-icon
                  slot="icon"
                  path="${mdiPlus}"
                  color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
                ></grampsjs-icon>
                ${this._(newBtnLabel[this.objectType])}
              </md-outlined-button>
            `
          : ''}
      </div>

      <grampsjs-object-picker-dialog
        objectType="${this.objectType}"
        .excludeHandles="${this._handleList()}"
        .appState="${this.appState}"
        @select-object:selected="${this._handleSelected}"
      ></grampsjs-object-picker-dialog>

      ${this._newObjectDialogOpen ? this._renderNewObjectDialog() : ''}
    `
  }

  // The create form contains object selectors of its own (e.g. Enclosed By),
  // whose select-object:changed events would otherwise bubble out of this
  // element and be taken as a change of this selector.
  _renderNewObjectDialog() {
    return html`
      <div
        @object:save="${this._handleNewObjectSave}"
        @object:cancel="${this._handleNewObjectCancel}"
        @select-object:changed="${this._stopPropagation}"
      >
        ${this.objectType === 'place'
          ? html`
              <grampsjs-form-new-place
                .appState="${this.appState}"
                dialogTitle="${this._(newDialogTitle[this.objectType])}"
              ></grampsjs-form-new-place>
            `
          : ''}
      </div>
    `
  }

  _canCreate() {
    return (
      this.allowNew &&
      !this.hideButton &&
      this.objectType in newBtnLabel &&
      !!this.appState?.permissions?.canAdd
    )
  }

  reset() {
    this.objects = []
  }

  _handleList() {
    return this.objects
      .map(_obj => _obj.handle ?? _obj.object?.handle)
      .filter(Boolean)
  }

  _handleSelected(e) {
    this._selectObject(e.detail)
  }

  _selectObject(obj) {
    const handle = obj.handle ?? obj.object?.handle
    if (!this.multiple) {
      this.objects = [obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    } else if (!this._handleList().includes(handle)) {
      this.objects = [...this.objects, obj]
      fireEvent(this, 'select-object:changed', {objects: this.objects})
    }
  }

  open() {
    const query = this.initialQuery
    this.initialQuery = ''
    this.renderRoot.querySelector('grampsjs-object-picker-dialog')?.open(query)
  }

  _handleBtnClick() {
    this.open()
  }

  _handleNewBtnClick() {
    this._newObjectDialogOpen = true
  }

  async _handleNewObjectSave(e) {
    e.preventDefault()
    e.stopPropagation()
    this._newObjectDialogOpen = false
    const {objectType} = this
    const handle = makeHandle()
    const payload = {...e.detail.data, handle}
    const data = await this.appState.apiPost(
      `/api/${objectTypeToEndpoint[objectType]}/`,
      payload
    )
    if (!('data' in data)) {
      fireEvent(this, 'grampsjs:error', {
        message: data.error || `Failed to create ${objectType}`,
      })
      return
    }
    // The form holding this selector may have been closed during the request.
    if (!this.isConnected) return
    const object =
      data.data.find(obj => obj.new?.handle === handle)?.new ?? payload
    this._selectObject({object_type: objectType, handle, object})
  }

  _handleNewObjectCancel(e) {
    e.preventDefault()
    e.stopPropagation()
    this._newObjectDialogOpen = false
  }

  // eslint-disable-next-line class-methods-use-this
  _stopPropagation(e) {
    e.stopPropagation()
  }
}

window.customElements.define(
  'grampsjs-form-select-object',
  GrampsjsFormSelectObject
)
