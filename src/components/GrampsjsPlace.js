import {html} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormEditLatLong.js'
import {fireEvent} from '../util.js'

const BASE_DIR = ''

export class GrampsjsPlace extends GrampsjsObject {
  constructor() {
    super()
    this._showReferences = false
  }

  renderProfile() {
    return html`
      <h2>
        <mwc-icon class="person">place</mwc-icon> ${this.data?.name?.value ||
        this.data.title ||
        this._('Place')}
      </h2>

      ${this.data?.profile?.type
        ? html`<p>${this.data?.profile?.type}</p>`
        : ''}
      ${this.data?.profile?.parent_places.length > 0
        ? html`
            <dl>
              ${this.data.profile.parent_places.map(
                obj => html`
                  <div>
                    <dt>${obj.type}</dt>
                    <dd>
                      <a href="${BASE_DIR}/place/${obj.gramps_id}"
                        >${obj.name}</a
                      >
                    </dd>
                  </div>
                `
              )}
            </dl>
          `
        : ''}
    `
  }

  _handleEditGeo() {
    let data = {}
    if (this.data.profile.lat && this.data.profile.long) {
      data = {lat: this.data.profile.lat, long: this.data.profile.long}
    }
    this.dialogContent = html`
      <grampsjs-form-edit-lat-long
        @object:save="${this._handleSaveLatLong}"
        @object:cancel="${this._handleCancelDialog}"
        .strings="${this.strings}"
        .data="${data}"
      ></grampsjs-form-edit-lat-long>
    `
  }

  _handleSaveLatLong(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-place', GrampsjsPlace)
