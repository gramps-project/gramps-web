import {css, html} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormEditLatLong.js'
import './GrampsjsFormEditPlaceName.js'
import {fireEvent} from '../util.js'

const BASE_DIR = ''

export class GrampsjsPlace extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }

        #btn-edit-type {
          vertical-align: middle;
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Places'
    this._objectEndpoint = 'places'
    this._objectIcon = 'place'
  }

  renderProfile() {
    return html`
      <h2>
        ${this.data?.name?.value || this.data.title || this._('Place')}
        ${this.edit
          ? html`
              <mwc-icon-button
                icon="edit"
                class="edit"
                @click="${this._handleEditName}"
              ></mwc-icon-button>
            `
          : ''}
      </h2>

      ${this.data?.profile?.type || this.edit
        ? html`<p>
            ${this.data?.profile?.type || this._('Unknown')}
            ${this.edit
              ? html`
                  <mwc-icon-button
                    id="btn-edit-type"
                    icon="edit"
                    class="edit"
                    @click="${this._handleEditType}"
                  ></mwc-icon-button>
                `
              : ''}
          </p>`
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
      data = {
        lat: `${this.data.profile.lat}`,
        long: `${this.data.profile.long}`,
      }
    }
    this.dialogContent = html`
      <grampsjs-form-edit-lat-long
        @object:save="${this._handleSaveLatLong}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data="${data}"
      ></grampsjs-form-edit-lat-long>
    `
  }

  _handleEditName() {
    this.dialogContent = html`
      <grampsjs-form-edit-placename
        @object:save="${this._handleSaveName}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${this.data?.name || {}}
        prop="value"
      >
      </grampsjs-form-edit-placename>
    `
  }

  _handleEditType() {
    this.dialogContent = html`
      <grampsjs-form-edit-type
        dialogTitle="${this._('Edit place type')}"
        formId="place-type"
        typeName="place_types"
        @object:save="${this._handleSaveType}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{
          type: this.data?.place_type?.string || this.data?.place_type || '',
        }}
        prop="value"
      >
      </grampsjs-form-edit-type>
    `
  }

  _handleSaveName(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {name: e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSaveLatLong(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-place', GrampsjsPlace)
