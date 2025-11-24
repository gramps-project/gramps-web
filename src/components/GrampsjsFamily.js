import {css, html} from 'lit'

import '@material/mwc-icon'

import {ringsIcon} from '../icons.js'
import {fireEvent, renderPerson} from '../util.js'
import './GrampsjsFormEditFamily.js'
import './GrampsjsFormNewPerson.js'
import './GrampsjsFormPersonRef.js'
import {GrampsjsObject} from './GrampsjsObject.js'

export class GrampsjsFamily extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          .parent {
            display: flex;
            align-items: center;
            margin-top: 1em;
            margin-bottom: 1em;
          }
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
      <p>
        ${this._renderRelType()} ${this._renderMarriage()}
        ${this._renderDivorce()}
      </p>
      ${this.edit
        ? html`
            <mwc-icon-button
              icon="edit"
              class="edit"
              @click="${this._handleEditFamily}"
            ></mwc-icon-button>
          `
        : ''}
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
    return html`
      <h4 class="label">${this._('Father')}</h4>
      ${this._renderParent('father')}
    `
  }

  _renderMother() {
    return html`
      <h4 class="label">${this._('Mother')}</h4>
      ${this._renderParent('mother')}
    `
  }

  _renderParent(parent) {
    const profile = this.data?.profile[parent]
    const hasProfile = Object.keys(profile ?? {}).length > 0

    return html`
      <div class="parent">
        ${!this.edit || hasProfile ? renderPerson(profile || {}) : ''}
        ${this.edit && hasProfile
          ? html`
              <mwc-icon-button
                class="edit"
                icon="link_off"
                @click="${e => this._handleParentChanged(e, parent)}"
              ></mwc-icon-button>
            `
          : ''}
      </div>
      ${this.edit
        ? html`
            <mwc-icon-button
              class="edit"
              icon="add_link"
              @click="${() => this._handleParentShare(parent)}"
            ></mwc-icon-button>
            <mwc-icon-button
              class="edit"
              icon="add"
              @click="${() => this._handleAddNewParent(parent)}"
            ></mwc-icon-button>
          `
        : ''}
    `
  }

  _renderMarriage() {
    const obj = this.data?.profile?.marriage
    if (!obj?.date && !obj?.place) {
      return ''
    }
    return html`
      <span class="event">
        <i>${ringsIcon}</i>
        ${obj.date || ''} ${obj.place ? this._('in') : ''}
        ${obj.place_name || obj.place || ''}
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

  _handleAddNewParent(parent) {
    this.dialogContent = html`
      <grampsjs-form-new-person
        @object:save="${e => this._handleNewParentSave(e, parent)}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
  }

  _handleParentShare(parent) {
    this.dialogContent = html`
      <grampsjs-form-personref
        @object:save="${e => this._handleParentChanged(e, parent)}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Select an existing person')}"
      >
      </grampsjs-form-personref>
    `
  }

  _handleParentChanged(e, parent) {
    const handle = e.detail.data?.ref ?? ''
    const updatedFamily = {[`${parent}_handle`]: handle}
    fireEvent(this, 'edit:action', {action: 'updateProp', data: updatedFamily})
    this.dialogContent = ''
  }

  _handleEditFamily() {
    const data = {
      type: this.data?.type?.string || this.data.type,
    }

    this.dialogContent = html`
      <grampsjs-form-edit-family
        @object:save="${this._handleSaveDetails}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${data}
      >
      </grampsjs-form-edit-family>
    `
  }

  _handleNewParentSave(e, parent) {
    const data = {
      ...e.detail.data,
      parent,
    }
    fireEvent(this, 'edit:action', {
      action: 'newParent',
      data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSaveDetails(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-family', GrampsjsFamily)
