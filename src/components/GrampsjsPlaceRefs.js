import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsFormPlaceRef.js'
import {fireEvent} from '../util.js'
import {apiGet} from '../api.js'
import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import '@material/mwc-button'

export class GrampsjsPlaceRefs extends GrampsjsEditableTable {
  static get properties () {
    return {
      places: {type: Array},
      dialogContent: {type: String}
    }
  }

  constructor () {
    super()
    this.places = []
    this.objType = 'Place'
    this._columns = ['Name', 'Type', '']
    this.dialogContent = ''
  }

  row (obj, i, arr) {
    const prof = this.places.length > i ? this.places[i].profile : {}
    return html`
      <tr @click=${() => this._handleClick(prof.gramps_id)}>
        <td>${prof.name}</td>
        <td>${prof.type}</td>
        <td>${this.edit
    ? this._renderActionBtns(obj.ref, i === 0, i === arr.length - 1)
    : ''}</td>

      </tr>
    `
  }

  renderAfterTable () {
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

  update (changed) {
    super.update(changed)
    if (changed.has('data')) {
      this._updateData()
    }
  }

  async _updateData () {
    if (this.data.length === 0) {
      this.places = []
    } else {
      const _places = []
      this.loading = true
      const handles = this.data.map(obj => obj.ref)
      for (let i = 0; i < handles.length; i++) {
        const data = await apiGet(this._getUrl(handles[i]))
        _places.push(data?.data || {})
      }
      this.places = [..._places]
    }
  }

  _getUrl (handle) {
    return `/api/places/${handle}?profile=self`
  }

  _handleAddClick () {
    this.dialogContent = html`
    <grampsjs-form-placeref
      new
      @object:save="${this._handlePlaceRefAdd}"
      @object:cancel="${this._handlePlaceRefCancel}"
      .strings="${this.strings}"
      dialogTitle = ${this._('Share an existing place')}
    >
    </grampsjs-form-placeref>
    `
  }

  _handlePlaceRefAdd (e) {
    fireEvent(this, 'edit:action', {action: 'addPlaceRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceRefCancel () {
    this.dialogContent = ''
  }

  _handleClick (grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath (grampsId) {
    return `place/${grampsId}`
  }
}

window.customElements.define('grampsjs-place-refs', GrampsjsPlaceRefs)
