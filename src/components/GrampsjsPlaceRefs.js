import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormPlaceRef.js'
import {fireEvent} from '../util.js'

import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsPlaceRefs extends GrampsjsEditableTable {
  static get properties() {
    return {
      places: {type: Array},
      dialogContent: {type: String},
    }
  }

  constructor() {
    super()
    this.places = []
    this.objType = 'Place'
    this._columns = ['Name', 'Type', 'Date', '']
    this.dialogContent = ''
    this.profile = []
  }

  row(obj, i, arr) {
    const placeProf = this.places.length > i ? this.places[i].profile : {}
    const placeRefProf = this.profile.length > i ? this.profile[i] : {}
    return html`
      <tr @click=${() => this._handleClick(placeProf.gramps_id)}>
        <td>${placeProf.name}</td>
        <td>${placeProf.type}</td>
        <td>${placeRefProf.date_str}</td>
        <td>
          ${this.edit
            ? this._renderActionBtns(i, i === 0, i === arr.length - 1, true)
            : ''}
        </td>
      </tr>
    `
  }

  renderAfterTable() {
    return this.edit
      ? html`
          <mwc-icon-button
            class="edit large"
            icon="add_circle"
            @click="${this._handleAddClick}"
          ></mwc-icon-button>
          ${this.dialogContent}
        `
      : ''
  }

  update(changed) {
    super.update(changed)
    if (changed.has('data')) {
      this._updateData()
    }
  }

  async _updateData() {
    if (this.data.length === 0) {
      this.places = []
    } else {
      const _places = []
      this.loading = true
      const handles = this.data.map(obj => obj.ref)
      for (let i = 0; i < handles.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const data = await this.appState.apiGet(this._getUrl(handles[i]))
        _places.push(data?.data || {})
      }
      this.places = [..._places]
    }
  }

  _getUrl(handle) {
    return `/api/places/${handle}?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self`
  }

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-placeref
        new
        @object:save="${this._handlePlaceRefAdd}"
        @object:cancel="${this._handlePlaceRefCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('Link to enclosing place')}
      >
      </grampsjs-form-placeref>
    `
  }

  _handlePlaceRefAdd(e) {
    fireEvent(this, 'edit:action', {action: 'addPlaceRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceRefUpdate(e, originalObj) {
    fireEvent(this, 'edit:action', {
      action: 'updatePlaceRef',
      index: this.data.indexOf(originalObj),
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceRefCancel() {
    this.dialogContent = ''
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  _handleActionClick(e, action, index) {
    fireEvent(this, 'edit:action', {action, index})
    e.preventDefault()
    e.stopPropagation()
  }

  _handleEditClick(index) {
    const placeRef = this.data[index]
    const place = this.places[index]
    this.dialogContent = html`
      <grampsjs-form-placeref
        @object:save="${e => this._handlePlaceRefUpdate(e, placeRef)}"
        @object:cancel="${this._handlePlaceRefCancel}"
        .appState="${this.appState}"
        .data="${placeRef}"
        .place="${place}"
        dialogTitle=${this._('Link to enclosing place')}
      >
      </grampsjs-form-placeref>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `place/${grampsId}`
  }
}

window.customElements.define('grampsjs-place-refs', GrampsjsPlaceRefs)
