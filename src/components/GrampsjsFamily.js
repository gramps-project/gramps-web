import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import {ringsIcon} from '../icons.js'
import {renderPerson, fireEvent} from '../util.js'
import './GrampsjsFormEditFamily.js'

export class GrampsjsFamily extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Families'
    this._objectEndpoint = 'families'
    this._objectIcon = 'people'
  }

  renderProfile() {
    return html`
      <h2>${this._renderTitle()}</h2>
      ${this._renderFather()} ${this._renderMother()}
      ${this.edit
        ? html`
            <mwc-icon-button
              icon="edit"
              class="edit"
              @click="${this._handleEditFamily}"
            ></mwc-icon-button>
          `
        : ''}
      <p>
        ${this._renderRelType()} ${this._renderMarriage()}
        ${this._renderDivorce()}
      </p>
    `
  }

  _renderTitle() {
    return html`
      ${this.data?.profile?.father?.name_given || '…'}
      ${this.data?.profile?.father?.name_surname || '…'} &amp;
      ${this.data?.profile?.mother?.name_given || '…'}
      ${this.data?.profile?.mother?.name_surname || '…'}
    `
  }

  _renderRelType() {
    if (!this.data?.type || !this.data?.profile?.relationship) {
      return ''
    }
    return html`
      <span class="event">
        ${this._('Relationship type:')} ${this.data.profile.relationship}
      </span>
    `
  }

  _renderFather() {
    return html` <p>${renderPerson(this.data?.profile?.father || {})}</p> `
  }

  _renderMother() {
    return html` <p>${renderPerson(this.data?.profile?.mother || {})}</p> `
  }

  _renderMarriage() {
    const obj = this.data?.profile?.marriage
    if (!obj?.date && !obj?.place) {
      return ''
    }
    return html`
      <span class="event">
        <i>${ringsIcon}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''} ${obj.place || ''}
      </span>
    `
  }

  _renderDivorce() {
    const obj = this.data?.profile?.divorce
    if (obj === undefined || Object.keys(obj).length === 0) {
      return ''
    }
    return html`
      <span class="event">
        <i>oo</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''} ${obj.place || ''}
      </span>
    `
  }

  _handleEditFamily() {
    const data = {
      father_handle: this.data.father_handle,
      mother_handle: this.data.mother_handle,
      type: this.data?.type?.string || this.data.type,
    }
    const father = this.data?.extended?.father
    const mother = this.data?.extended?.mother
    const fatherProfile = this.data?.profile?.father
    const motherProfile = this.data?.profile?.mother

    this.dialogContent = html`
      <grampsjs-form-edit-family
        @object:save="${this._handleSaveDetails}"
        @object:cancel="${this._handleCancelDialog}"
        .strings=${this.strings}
        .data=${data}
        .father=${father}
        .mother=${mother}
        .fatherProfile=${fatherProfile}
        .motherProfile=${motherProfile}
      >
      </grampsjs-form-edit-family>
    `
  }

  _handleSaveDetails(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-family', GrampsjsFamily)
