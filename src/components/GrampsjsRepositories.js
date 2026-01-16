import {html} from 'lit'

import {GrampsjsEditableTable} from './GrampsjsEditableTable.js'
import './GrampsjsObjectForm.js'
import './GrampsjsFormRepoRef.js'
import {fireEvent} from '../util.js'

export class GrampsjsRepositories extends GrampsjsEditableTable {
  static get properties() {
    return {
      extended: {type: Array},
    }
  }

  constructor() {
    super()
    this.extended = []
    this.objType = 'Repository'
    this._columns = ['Title', 'Call Number', '_Media Type:', '']
    this.dialogContent = ''
  }

  row(obj, i, arr) {
    return html`
      <tr @click=${() => this._handleClick(this.extended[i].gramps_id)}>
        <td>${this.extended[i].name}</td>
        <td>${obj.call_number}</td>
        <td>${this._(obj.media_type)}</td>
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

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-reporef
        new
        @object:save="${this._handleRepoRefAdd}"
        @object:cancel="${this._handleRepoRefCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Add an existing repository')}
      >
      </grampsjs-form-reporef>
    `
  }

  _handleRepoRefAdd(e) {
    if (e.detail.data.ref) {
      fireEvent(this, 'edit:action', {
        action: 'addRepoRef',
        data: e.detail.data,
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEditClick(handle) {
    const repoRefData = this.data[handle] || {}
    const repoData = this.extended[handle] || {}

    this.dialogContent = html`
      <grampsjs-form-reporef
        new
<<<<<<< HEAD
        @object:save="${e => this._handleRepoRefEdit(e, repoRefData)}"
        @object:cancel="${this._handleRepoRefCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
=======
        @object:save="${e => this._handleRepoRefEdit(e, handle)}"
        @object:cancel="${this._handleRepoRefCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        .repoRefKey="${handle}"
>>>>>>> af7478d (Updated the files)
        .data="${repoRefData}"
        .repoData="${repoData}"
        dialogTitle=${this._('Edit an existing repository')}
      >
      </grampsjs-form-reporef>
    `
  }

  _handleRepoRefEdit(e, originalObj) {
    if (e.detail.data.ref) {
      fireEvent(this, 'edit:action', {
        action: 'updateRepoRef',
        index: this.data.indexOf(originalObj),
        data: e.detail.data,
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleRepoRefCancel() {
    this.dialogContent = ''
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `repository/${grampsId}`
  }
}

window.customElements.define('grampsjs-repositories', GrampsjsRepositories)
