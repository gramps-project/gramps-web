import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import {
  fireEvent,
  renderIcon,
  objectDetail,
  makeHandle,
  eventTypeIconPath,
} from '../util.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsFormNewEvent.js'
import './GrampsjsObjectForm.js'
import '@material/mwc-icon-button'
import '@material/mwc-button'

export class GrampsjsEvents extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        md-list-item {
          --md-list-item-top-space: 16px;
          --md-list-item-bottom-space: 16px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      profile: {type: Array},
      eventRef: {type: Array},
      dialogContent: {type: String},
      useSummary: {type: Boolean},
      sorted: {type: Boolean},
      defaultRole: {type: String},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.eventRef = []
    this.objType = 'Event'
    this.useSummary = false
    this.sorted = false
    this.hasAdd = false
    this.hasShare = true
    this.hasReorder = true
    this.defaultRole = 'Primary'
  }

  row(obj, i) {
    const j = this.data.indexOf(obj)
    const objProfile = {...obj, profile: this.profile[j]}
    const typeKey = typeof obj.type === 'string' ? obj.type : obj.type?.value
    return html`
      <md-list-item
        type="button"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else {
            this._handleClick(obj.gramps_id)
          }
        }}"
      >
        ${this._getPrimaryText(objProfile)}
        <span slot="supporting-text"
          >${this._getSecondaryText(objProfile)}</span
        >
        ${renderIcon(
          {object: obj, object_type: 'event'},
          'start',
          eventTypeIconPath[typeKey] || null
        )}
        ${objProfile.profile?.age && /\d/.test(objProfile.profile.age)
          ? html`<span slot="trailing-supporting-text"
              >${objProfile.profile.age}</span
            >`
          : ''}
      </md-list-item>
    `
  }

  _getPrimaryText(obj) {
    if (this.useSummary) {
      return obj.profile.summary
    }
    return html`
      ${obj.profile.type}
      ${!obj.profile?.role ||
      ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
        obj.profile?.role
      )
        ? ''
        : `(${obj.profile?.role})`}
    `
  }

  _getSecondaryText(obj) {
    const detail = objectDetail('event', obj, this.appState.i18n.strings) || ''
    const context = obj.profile?.context || ''
    const titleLine = [obj.description, context].filter(Boolean).join(' • ')
    return html`
      ${titleLine} ${titleLine && detail.trim() ? html`<br />` : ''} ${detail}
    `
  }

  // row(obj, i, arr) {
  //   const j = this.data.indexOf(obj)
  //   const prof = this.profile[j]
  //   return html`
  //     <tr @click=${() => this._handleClick(obj.gramps_id)}>
  //       <td>${prof.date}</td>
  //       <td>
  //         ${prof.type}
  //         ${!prof?.role ||
  //         ['Primary', 'Family', this._('Primary'), this._('Family')].includes(
  //           prof?.role
  //         )
  //           ? ''
  //           : `(${prof?.role})`}
  //       </td>
  //       <td>${this.useSummary ? prof.summary : obj.description}</td>
  //       <td>${prof.place}</td>
  //       <td>
  //         ${this.edit
  //           ? this._renderActionBtns(obj.handle, i === 0, i === arr.length - 1)
  //           : html`${obj?.media_list?.length > 0
  //               ? html` <mwc-icon class="inline">photo</mwc-icon>`
  //               : ''}
  //             ${obj?.note_list?.length > 0 > 0
  //               ? html` <mwc-icon class="inline">sticky_note_2</mwc-icon>`
  //               : ''}`}
  //       </td>
  //     </tr>
  //   `
  // }

  sortData(dataCopy) {
    if (!this.sorted) {
      return dataCopy
    }
    return dataCopy.sort(
      (a, b) => (a?.date?.sortval || 0) - (b?.date?.sortval || 0)
    )
  }

  _handleShare() {
    this.dialogContent = html`
      <grampsjs-form-eventref
        new
        id="share-event-ref"
        defaultRole="${this.defaultRole}"
        @object:save="${this._handleEventRefSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Share an existing event')}
      >
      </grampsjs-form-eventref>
    `
  }

  _handleEdit() {
    const data = this.eventRef[this._selectedIndex]
    this.dialogContent = html`
      <grampsjs-form-eventref
        id="edit-event-ref"
        @object:save="${this._handleEventRefSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        .data="${data}"
        dialogTitle=${this._('Event Reference Editor')}
      >
      </grampsjs-form-eventref>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-event
        defaultRole="${this.defaultRole}"
        @object:save="${this._handleNewEventSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new event')}"
      >
      </grampsjs-form-new-event>
    `
  }

  _handleNewEventSave(e) {
    const handle = makeHandle()
    fireEvent(this, 'edit:action', {
      action: 'newEvent',
      data: {handle, ...e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addEventRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEventRefSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateEventRef',
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

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delEvent',
      index: this._selectedIndex,
    })
  }

  _handleUp() {
    const handle = this.data?.[this._selectedIndex]?.handle
    if (handle) {
      fireEvent(this, 'edit:action', {
        action: 'upEvent',
        handle: this.data[this._selectedIndex].handle,
      })
      this._updateSelectionAfterReorder(true)
    }
  }

  _handleDown() {
    const handle = this.data?.[this._selectedIndex]?.handle
    if (handle) {
      fireEvent(this, 'edit:action', {
        action: 'downEvent',
        handle: this.data[this._selectedIndex].handle,
      })
      this._updateSelectionAfterReorder(false)
    }
  }

  _handleClick(grampsId) {
    if (!this.edit) {
      fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `event/${grampsId}`
  }
}

window.customElements.define('grampsjs-events', GrampsjsEvents)
