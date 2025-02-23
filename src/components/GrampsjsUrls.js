import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditUrl.js'

import {fireEvent} from '../util.js'

import '@material/mwc-icon'
import '@material/mwc-list/mwc-list-item'

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function fixUrl(input) {
  let url = input
  try {
    url = new URL(input)
  } catch (error) {
    if (isValidEmail(input)) {
      return `mailto:${input}`
    }
    return `https://${input}`
  }
  return url
}

export class GrampsjsUrls extends GrampsjsEditableList {
  row(obj) {
    return html`
      <mwc-list-item
        twoline
        graphic="avatar"
        ?hasMeta="${this.edit}"
        @click="${() => this._handleClick(obj)}"
      >
        <a
          href="${fixUrl(obj.path)}"
          target="_blank"
          class="${classMap({nopointer: this.edit})}"
          >${obj.path}</a
        >
        <span slot="secondary"
          >${this._(obj.type)}${obj.type && obj.desc
            ? html` &ndash; `
            : ''}${obj.desc}</span
        >
        <mwc-icon slot="graphic">open_in_new</mwc-icon>
      </mwc-list-item>
    `
  }

  _handleClick(obj) {
    if (!this.edit) {
      window.open(obj.path, '_blank')
    }
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-url
        new
        @object:save="${this._handleUrlSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-url>
    `
  }

  _handleEdit() {
    const url = this.data[this._selectedIndex]
    const data = {
      type: {_class: 'UrlType', string: url.type || ''},
      path: url.path || '',
      desc: url.desc || '',
    }
    this.dialogContent = html`
      <grampsjs-form-edit-url
        @object:save="${this._handleUrlSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
      >
      </grampsjs-form-edit-url>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delURL',
      index: this._selectedIndex,
    })
  }

  _handleUrlSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addURL',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleUrlSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateURL',
      data: e.detail.data,
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-urls', GrampsjsUrls)
