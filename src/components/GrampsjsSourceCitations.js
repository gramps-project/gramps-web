import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {fireEvent, makeHandle} from '../util.js'
import {renderIcon} from '../objectRender.js'
import './GrampsjsFormCitation.js'
import './GrampsjsFormNewCitation.js'

export class GrampsjsSourceCitations extends GrampsjsEditableList {
  constructor() {
    super()
    this.objType = 'Citation'
    this.hasReorder = true
    this.listProp = 'citation_list'
  }

  row(obj, i) {
    const isLink = !this.edit && obj.gramps_id !== this.grampsId
    return html`
      <md-list-item
        type="${isLink ? 'link' : 'button'}"
        href="${isLink ? `/${this._getItemPath(obj.gramps_id)}` : ''}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${obj?.profile?.source?.title || this._('Source')}
        <span slot="supporting-text"> ${obj.page || obj.gramps_id} </span>
        ${renderIcon({object: obj, object_type: 'citation'}, 'start')}
      </md-list-item>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-citation
        new
        @object:save="${this._handleCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('New Citation')}
      >
      </grampsjs-form-new-citation>
    `
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-citation
        new
        @object:save="${this._handleShareCitSave}"
        @object:cancel="${this._handleCitCancel}"
        .appState="${this.appState}"
        dialogTitle=${this._('Select an existing citation')}
      >
      </grampsjs-form-citation>
    `
  }

  _handleCitSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newCitation',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleShareCitSave(e) {
    fireEvent(this, 'edit:action', {action: 'addCitation', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDelete(e) {
    if (this.data?.[this._selectedIndex]) {
      fireEvent(this, 'edit:action', {
        action: 'delCitation',
        index: this._selectedIndex,
      })
    }
    e.preventDefault()
    e.stopPropagation()
  }

  _handleCitCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define(
  'grampsjs-source-citations',
  GrampsjsSourceCitations
)
