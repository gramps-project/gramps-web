import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiArchive} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsIcon.js'
import './GrampsjsFormRepoRef.js'
import {fireEvent} from '../util.js'

import '@material/web/list/list-item.js'

export class GrampsjsRepositories extends GrampsjsEditableList {
  static get properties() {
    return {
      extended: {type: Array},
    }
  }

  constructor() {
    super()
    this.extended = []
    this.objType = 'Repository'
    this.hasEdit = true
    this.hasReorder = true
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(this.extended[i]?.gramps_id)
          }
        }}"
      >
        ${this.extended[i]?.name ?? ''}
        ${obj.call_number || obj.media_type
          ? html`<span slot="supporting-text"
              >${[obj.call_number, this._(obj.media_type ?? '')]
                .filter(Boolean)
                .join(' • ')}</span
            >`
          : ''}
        <grampsjs-icon
          slot="start"
          path="${mdiArchive}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-reporef
        new
        @object:save="${this._handleRepoRefAdd}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Add an existing repository')}
      >
      </grampsjs-form-reporef>
    `
  }

  _handleEdit() {
    const repoRefData = this.data[this._selectedIndex] || {}
    const repoData = this.extended[this._selectedIndex] || {}
    this.dialogContent = html`
      <grampsjs-form-reporef
        @object:save="${this._handleRepoRefEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        .data="${repoRefData}"
        .repoData="${repoData}"
        dialogTitle=${this._('Edit repository reference')}
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

  _handleRepoRefEdit(e) {
    if (e.detail.data.ref) {
      fireEvent(this, 'edit:action', {
        action: 'updateRepoRef',
        index: this._selectedIndex,
        data: e.detail.data,
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delRepository',
      handle: this._selectedIndex,
    })
  }

  _handleUp() {
    fireEvent(this, 'edit:action', {
      action: 'upRepository',
      handle: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(true)
  }

  _handleDown() {
    fireEvent(this, 'edit:action', {
      action: 'downRepository',
      handle: this._selectedIndex,
    })
    this._updateSelectionAfterReorder(false)
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
