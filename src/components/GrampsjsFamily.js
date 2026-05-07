import {css, html} from 'lit'

import '@material/mwc-icon'

import {fireEvent} from '../util.js'
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
          .parent-dates {
            display: block;
            font-size: 0.85em;
          }

          .sym {
            font-weight: bold;
            color: var(--grampsjs-body-font-color-35);
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

  _parentLabel(role) {
    const fatherSex = this.data?.profile?.father?.sex
    const motherSex = this.data?.profile?.mother?.sex
    const hasFather = Object.keys(this.data?.profile?.father ?? {}).length > 0
    const hasMother = Object.keys(this.data?.profile?.mother ?? {}).length > 0
    const gendersEqual = hasFather && hasMother && fatherSex === motherSex
    if (role === 'father') {
      return gendersEqual ||
        (hasFather && fatherSex !== 'M' && fatherSex !== 'F')
        ? this._('Partner 1')
        : this._('Father')
    }
    return gendersEqual || (hasMother && motherSex !== 'M' && motherSex !== 'F')
      ? this._('Partner 2')
      : this._('Mother')
  }

  renderProfile() {
    return html`
      <h2>${this._renderTitle()}</h2>
      ${this._renderParent('father', this._parentLabel('father'))}
      ${this._renderParent('mother', this._parentLabel('mother'))}
      ${this._renderMarriageBlock()}
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

  _renderMarriageBlock() {
    const relType = this.data?.profile?.relationship
    const marriage = this.data?.profile?.marriage
    const divorce = this.data?.profile?.divorce
    const hasMarriage = marriage?.date || marriage?.place
    const hasDivorce = divorce && Object.keys(divorce).length > 0
    if (!relType && !hasMarriage && !hasDivorce) {
      return ''
    }
    return html`
      <dl>
        <div>
          <dt>${this._('Relationship type:').replace(':', '')}</dt>
          <dd>
            ${relType || ''}
            ${hasMarriage
              ? html`<span class="parent-dates">
                  <span class="sym">⚭</span>
                  ${marriage.date || ''}
                  ${marriage.place
                    ? `${this._('in')} ${marriage.place_name || marriage.place}`
                    : ''}
                </span>`
              : ''}
            ${hasDivorce
              ? html`<span class="parent-dates">
                  <span class="sym">⚮</span>
                  ${divorce.date || ''}
                  ${divorce.place ? `${this._('in')} ${divorce.place}` : ''}
                </span>`
              : ''}
          </dd>
        </div>
      </dl>
    `
  }

  _renderParent(parent, label) {
    const profile = this.data?.profile[parent]
    const hasProfile = Object.keys(profile ?? {}).length > 0
    const birthDate = profile?.birth?.date || ''
    const deathDate = profile?.death?.date || ''

    return html`
      <dl>
        <div>
          <dt>${label}</dt>
          <dd>
            ${hasProfile
              ? html`<a href="/person/${profile.gramps_id}"
                    >${profile.name_given || '…'}
                    ${profile.name_surname || '…'}</a
                  >
                  ${birthDate || deathDate
                    ? html`<span class="parent-dates">
                        ${birthDate
                          ? html`<span class="sym">∗</span> ${birthDate}`
                          : ''}
                        ${birthDate && deathDate ? ' ' : ''}
                        ${deathDate
                          ? html`<span class="sym">†</span> ${deathDate}`
                          : ''}
                      </span>`
                    : ''}`
              : '…'}
            ${this.edit && hasProfile
              ? html`
                  <mwc-icon-button
                    class="edit"
                    icon="link_off"
                    @click="${e => this._handleParentChanged(e, parent)}"
                  ></mwc-icon-button>
                `
              : ''}
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
          </dd>
        </div>
      </dl>
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
