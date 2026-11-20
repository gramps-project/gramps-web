import {css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {fireEvent} from '../util.js'
import {renderPrivacyIcon, rowPrivacy} from '../objectRender.js'
import {renderPersonAvatar, renderPersonDates} from './personListUtils.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {getSymbols} from '../symbols.js'
import './GrampsjsFormChildRef.js'
import './GrampsjsFormNewChild.js'
import './GrampsjsRefDetails.js'

import '@material/web/list/list-item.js'

export class GrampsjsChildren extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        md-list-item.highlight {
          opacity: 0.6;
          pointer-events: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      profile: {type: Array},
      highlightId: {type: String},
      extended: {type: Array},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.highlightId = ''
    this.extended = []
    this.hasShare = true
    this.hasEdit = true
    this.hasReorder = true
    this.listProp = 'child_ref_list'
    this.objType = 'ChildRef'
  }

  row(obj, i) {
    const p = this.profile[i] || {}

    const frel = obj.frel || 'Birth'
    const mrel = obj.mrel || 'Birth'
    const hasNonBirthRel = frel !== 'Birth' || mrel !== 'Birth'
    const relText = hasNonBirthRel
      ? `${this._('Father')}: ${this._(frel)} / ${this._('Mother')}: ${this._(
          mrel
        )}`
      : ''

    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'link'}"
        href="${this.edit ? '' : `/person/${p.gramps_id}`}"
        class="${classMap({
          selected: i === this._selectedIndex,
          highlight: p.gramps_id === this.highlightId,
        })}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${this._rowContent(obj, i)}
        ${hasNonBirthRel
          ? html`<span slot="supporting-text">${relText}</span>`
          : ''}
        ${this._renderRefCounts(obj, i)}
      </md-list-item>
    `
  }

  _rowContent(obj, i) {
    const p = this.profile[i] || {}
    const extPerson = this.extended.find(e => e?.handle === obj.ref) || null
    return html`
      ${p.name_given || ''} ${p.name_surname || ''}
      ${renderPrivacyIcon(rowPrivacy(extPerson, obj), this.appState)}
      ${renderPersonDates(
        p,
        getSymbols(this.appState.settings, s => this._(s))
      )}
      ${renderPersonAvatar(extPerson, p.sex)}
    `
  }

  _refDetailsContext(obj, i) {
    return {
      title: this._('Child'),
      intro: this._(
        'The information below applies to this child in this family.'
      ),
      summary: this._rowContent(obj, i),
    }
  }

  _handleDelete() {
    if (this.data[this._selectedIndex]) {
      fireEvent(this, 'edit:action', {
        action: 'delChildRef',
        index: this._selectedIndex,
      })
    }
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-childref
        new
        @object:save="${this._handleChildRefSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Add existing child to family')}
      >
      </grampsjs-form-childref>
    `
  }

  _handleEdit() {
    const childRef = this.data[this._selectedIndex]
    if (!childRef) {
      return
    }
    this.dialogContent = html`
      <grampsjs-form-childref
        @object:save="${e => this._handleChildRefEdit(e, this._selectedIndex)}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${childRef}"
        .summary="${this._rowContent(childRef, this._selectedIndex)}"
        objType="${this.objType}"
        dialogTitle=${this._('Child')}
      >
      </grampsjs-form-childref>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-child
        @object:save="${this._handleNewChildSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new person')}"
      >
      </grampsjs-form-new-child>
    `
  }

  _handleNewChildSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'newChild',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleChildRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addChildRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleChildRefEdit(e, index) {
    fireEvent(this, 'edit:action', {
      action: 'updateChildRef',
      index,
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-children', GrampsjsChildren)
