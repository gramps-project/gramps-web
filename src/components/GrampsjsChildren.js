import {css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiAccount} from '@mdi/js'

import {fireEvent, objectIconPath} from '../util.js'
import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormChildRef.js'
import './GrampsjsFormNewChild.js'
import './GrampsjsImg.js'
import './GrampsjsIcon.js'

import '@material/web/list/list-item.js'

// Maps Gramps API sex string codes to CSS gender colour tokens.
// Covers all 4 values: F (female), M (male), U (unknown), X (other/non-binary)
const genderBorderColor = {
  F: 'var(--color-girl)',
  M: 'var(--color-boy)',
  X: 'var(--color-other)',
  U: 'var(--color-unknown)',
}

export class GrampsjsChildren extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        md-list-item.highlight {
          opacity: 0.6;
          pointer-events: none;
        }

        span.date-col {
          display: inline-block;
          min-width: 12ch;
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
    this.hasReorder = true
    this.objType = 'ChildRef'
  }

  row(obj, i) {
    const p = this.profile[i] || {}
    const extPerson = this.extended.find(e => e.handle === obj.ref) || null
    const birthStr = p.birth?.date || ''
    const deathStr = p.death?.date || ''
    const ageStr = p.death?.date && p.death?.age ? `(${p.death.age})` : ''
    const hasDates = birthStr || deathStr || ageStr

    return html`
      <md-list-item
        type="button"
        class="${classMap({
          selected: i === this._selectedIndex,
          highlight: p.gramps_id === this.highlightId,
        })}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(p.gramps_id)
          }
        }}"
      >
        ${p.name_given || ''} ${p.name_surname || ''}
        ${hasDates
          ? html`<span slot="supporting-text"
              ><span class="date-col">${birthStr ? `∗ ${birthStr}` : ''}</span
              ><span class="date-col"
                >${deathStr ? `† ${deathStr}` : ''}${ageStr
                  ? ` ${ageStr}`
                  : ''}</span
              ></span
            >`
          : ''}
        ${this._renderChildAvatar(extPerson, p.sex)}
      </md-list-item>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderChildAvatar(extPerson, sex) {
    const handle = extPerson?.media_list?.[0]?.ref || ''
    const rect = extPerson?.media_list?.[0]?.rect || []
    // box-shadow sits flush against the circular edge with no gap, and works
    // equally well on both grampsjs-img and grampsjs-icon.
    const ringColor = genderBorderColor[sex] ?? 'var(--color-unknown)'
    const style = `box-shadow: 0 0 0 2px ${ringColor};`

    if (handle) {
      return html`<grampsjs-img
        handle="${handle}"
        slot="start"
        circle
        square
        size="40"
        .rect="${rect}"
        mime=""
        fallbackIcon="${objectIconPath.person}"
        style="${style}"
      ></grampsjs-img>`
    }
    return html`<grampsjs-icon
      slot="start"
      path="${mdiAccount}"
      color="var(--grampsjs-color-icon)"
      style="${style}"
    ></grampsjs-icon>`
  }

  _handleClick(grampsId) {
    if (!this.edit && grampsId) {
      fireEvent(this, 'nav', {path: `person/${grampsId}`})
    }
  }

  _handleDelete() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'delChildRef', handle: obj.ref})
    }
  }

  _handleUp() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'upChildRef', handle: obj.ref})
      this._updateSelectionAfterReorder(true)
    }
  }

  _handleDown() {
    const obj = this.data[this._selectedIndex]
    if (obj) {
      fireEvent(this, 'edit:action', {action: 'downChildRef', handle: obj.ref})
      this._updateSelectionAfterReorder(false)
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

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-children', GrampsjsChildren)
