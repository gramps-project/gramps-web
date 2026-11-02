import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiOpenInNew} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditUrl.js'
import './GrampsjsIcon.js'

import {fireEvent} from '../util.js'
import {fixUrl} from '../urlUtil.js'

import '@material/web/list/list-item.js'

export class GrampsjsUrls extends GrampsjsEditableList {
  constructor() {
    super()
    this.hasReorder = true
    this.listProp = 'urls'
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'text'}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        <a
          href="${fixUrl(obj.path, obj.type)}"
          target="_blank"
          rel="noopener noreferrer"
          class="${classMap({nopointer: this.edit})}"
          >${obj.path}</a
        >
        <span slot="supporting-text"
          >${this._(obj.type)}${obj.type && obj.desc
            ? html` &ndash; `
            : ''}${obj.desc}</span
        >
        <grampsjs-icon
          slot="start"
          path="${mdiOpenInNew}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
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
      type: url.type || '',
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
