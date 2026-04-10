import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormPlaceRef.js'
import {fireEvent, renderIcon, placeTypeIconPath} from '../util.js'

export class GrampsjsPlaceRefs extends GrampsjsEditableList {
  static get properties() {
    return {
      profile: {type: Array},
      dialogContent: {type: String},
      _places: {type: Array},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.dialogContent = ''
    this.objType = 'Place'
    this.hasAdd = false
    this.hasShare = true
    this.hasEdit = true
    this.hasReorder = true
    this._places = []
  }

  row(obj, i) {
    const place = this._places.find(p => p.handle === obj.ref) || null
    const name = place?.profile?.name || ''
    const type = place?.place_type
    const dateStr = this.profile[i]?.date_str || ''
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(place?.gramps_id)
          }
        }}"
      >
        ${name}
        <span slot="supporting-text">
          ${type ? this._(type) : ''}${type && dateStr ? ' · ' : ''}${dateStr}
        </span>
        ${place
          ? renderIcon(
              {object: place, object_type: 'place'},
              'start',
              placeTypeIconPath[type] || null
            )
          : ''}
      </md-list-item>
    `
  }

  update(changed) {
    super.update(changed)
    if (changed.has('data')) {
      this._updateData()
    }
  }

  async _updateData() {
    if (this.data.length === 0) {
      this._places = []
      return
    }
    const places = []
    const handles = this.data.map(obj => obj.ref)
    for (let i = 0; i < handles.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const data = await this.appState.apiGet(this._getUrl(handles[i]))
      places.push(data?.data || {})
    }
    this._places = places
  }

  _getUrl(handle) {
    return `/api/places/${handle}?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self`
  }

  _handleClick(grampsId) {
    if (grampsId) {
      fireEvent(this, 'nav', {path: `place/${grampsId}`})
    }
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-placeref
        new
        @object:save="${this._handlePlaceRefAdd}"
        @object:cancel="${this._handlePlaceRefCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('Link to enclosing place')}
      ></grampsjs-form-placeref>
    `
  }

  _handleEdit() {
    if (this._selectedIndex === -1) return
    const placeRef = this.data[this._selectedIndex]
    const place = this._places.find(p => p.handle === placeRef?.ref) || {}
    this.dialogContent = html`
      <grampsjs-form-placeref
        @object:save="${e => this._handlePlaceRefEdit(e, this._selectedIndex)}"
        @object:cancel="${this._handlePlaceRefCancel}"
        .appState="${this.appState}"
        .data="${placeRef}"
        .place="${place}"
        dialogTitle=${this._('Edit repository reference')}
      ></grampsjs-form-placeref>
    `
  }

  _handleDelete() {
    if (this._selectedIndex === -1) return
    fireEvent(this, 'edit:action', {
      action: 'delPlace',
      index: this._selectedIndex,
    })
  }

  _handleUp() {
    if (this._selectedIndex === -1) return
    fireEvent(this, 'edit:action', {
      action: 'upPlace',
      index: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(true)
  }

  _handleDown() {
    if (this._selectedIndex === -1) return
    fireEvent(this, 'edit:action', {
      action: 'downPlace',
      index: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(false)
  }

  _handlePlaceRefAdd(e) {
    fireEvent(this, 'edit:action', {action: 'addPlaceRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceRefEdit(e, index) {
    if (e.detail.data.ref) {
      fireEvent(this, 'edit:action', {
        action: 'updatePlaceRef',
        index,
        data: e.detail.data,
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handlePlaceRefCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-place-refs', GrampsjsPlaceRefs)
