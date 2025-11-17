import {css, html} from 'lit'

import '@material/mwc-icon'

import {ringsIcon} from '../icons.js'
import {fireEvent, renderPerson} from '../util.js'
import './GrampsjsFormEditFamily.js'
import './GrampsjsFormNewPerson.js'
import {GrampsjsObject} from './GrampsjsObject.js'

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

  _renderParent(type) {
    const profile = this.data?.profile[type]
    const extended = this.data?.extended[type]
    return html`
      ${this.edit
        ? html`
            <grampsjs-form-select-object-list
              objectType="person"
              .appState="${this.appState}"
              .objectsInitial="${extended.handle
                ? [
                    {
                      object_type: 'person',
                      object: {
                        ...extended,
                        profile,
                      },
                      handle: extended.handle,
                    },
                  ]
                : []}"
              class="edit"
            ></grampsjs-form-select-object-list>
            <mwc-button
              raised
              icon="add"
              class="edit"
              @click="${() => this._handleAddNewParent(type)}"
              >${this._('Add a new person')}</mwc-button
            >
          `
        : html`<p>${renderPerson(profile || {})}</p>`}
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

  _handleAddNewParent(type) {
    this.dialogContent = html`
      <grampsjs-form-new-person
        @object:save="${e => this._handleNewParentSave(e, type)}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-person>
    `
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

  _handleNewParentSave(e, type) {
    const data = {
      ...e.detail.data,
      type,
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
