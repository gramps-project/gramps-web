import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiStar} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsImg.js'
import './GrampsjsIcon.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsFormParticipantRef.js'
import {
  personTitleFromProfile,
  familyTitleFromProfile,
  fireEvent,
  typeString,
} from '../util.js'
import {renderIcon, renderPrivacyIcon, rowPrivacy} from '../objectRender.js'

const PRIMARY_ROLES_EN = new Set(['Primary', 'Family'])

/*
One row per reference to the event, in the order of each participant's
event list. `occurrence` counts the references of a participant to the
event, since a participant may refer to it more than once.
*/
export function participantRefRows(participants, backlinks, eventHandle) {
  const byHandle = Object.fromEntries(
    backlinks.filter(obj => obj?.handle).map(obj => [obj.handle, obj])
  )
  const seen = {}
  const toRow = (objectType, profile, role) => {
    const handle = profile?.handle
    const occurrence = seen[handle] ?? 0
    seen[handle] = occurrence + 1
    const backlink = byHandle[handle] ?? {}
    const ref = (backlink.event_ref_list || []).filter(
      el => el?.ref === eventHandle
    )[occurrence]
    return {
      object_type: objectType,
      handle,
      occurrence,
      role,
      roleValue: typeString(ref?.role),
      privacy: rowPrivacy(backlink, ref),
      backlink,
      title:
        (objectType === 'family'
          ? familyTitleFromProfile(profile)
          : personTitleFromProfile(profile)) || '',
      path: `${objectType}/${profile?.gramps_id}`,
    }
  }
  return [
    ...(participants?.families || []).map(obj =>
      toRow('family', obj.family, obj.role)
    ),
    ...(participants?.people || []).map(obj =>
      toRow('person', obj.person, obj.role)
    ),
  ]
}

export class GrampsjsParticipants extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        span[slot='supporting-text'] {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        grampsjs-icon.role-star {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      backlinksPeople: {type: Array},
      backlinksFamilies: {type: Array},
      eventHandle: {type: String},
      noLink: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.hasAdd = true
    this.hasEdit = true
    this.backlinksPeople = []
    this.backlinksFamilies = []
    this.eventHandle = ''
    this.noLink = false
  }

  _isPrimaryRole(role) {
    return (
      PRIMARY_ROLES_EN.has(role) ||
      role === this._('Primary') ||
      role === this._('Family')
    )
  }

  _roleLabel(role) {
    return html`
      <span slot="supporting-text">
        ${this._isPrimaryRole(role)
          ? html`<grampsjs-icon
              class="role-star"
              path="${mdiStar}"
              color="currentColor"
            ></grampsjs-icon>`
          : ''}
        ${this._(role)}
      </span>
    `
  }

  // Flatten {families, people} into a sorted normalized array for the base render()
  sortData(dataCopy) {
    const participants = dataCopy[0]
    if (!participants || Object.keys(participants).length === 0) return []
    return participantRefRows(
      participants,
      [...this.backlinksFamilies, ...this.backlinksPeople],
      this.eventHandle
    ).sort((a, b) => {
      const aP = this._isPrimaryRole(a.role) ? 0 : 1
      const bP = this._isPrimaryRole(b.role) ? 0 : 1
      return aP - bP
    })
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.noLink && !this.edit ? 'text' : 'button'}"
        class="${classMap({selected: this.edit && i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          } else if (!this.noLink) {
            fireEvent(this, 'nav', {path: obj.path})
          }
        }}"
      >
        ${obj.title} ${renderPrivacyIcon(obj.privacy, this.appState)}
        ${this._roleLabel(obj.role)}
        ${renderIcon(
          {object_type: obj.object_type, object: obj.backlink},
          'start'
        )}
      </md-list-item>
    `
  }

  get _selectedRow() {
    return this.sortData([...this.data])[this._selectedIndex]
  }

  // the saved change reloads the list, which may reorder the rows
  _fireChange(change) {
    this._selectedIndex = -1
    fireEvent(this, 'edit:action', {action: 'changeParticipantRef', change})
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-participant-ref
        .appState="${this.appState}"
        dialogTitle="${this._('Add Participant')}"
        @object:save="${this._handleAddSave}"
        @object:cancel="${this._handleDialogCancel}"
      ></grampsjs-form-participant-ref>
    `
  }

  _handleAddSave(e) {
    const {ref, object_type: objectType, role} = e.detail.data
    if (ref && objectType) {
      this._fireChange({
        action: 'add',
        objectType,
        handle: ref,
        role: typeString(role),
      })
    }
    this._closeDialog(e)
  }

  _handleEdit() {
    const row = this._selectedRow
    if (!row) {
      return
    }
    this.dialogContent = html`
      <grampsjs-form-eventref
        .appState="${this.appState}"
        .data="${{ref: this.eventHandle, role: row.roleValue}}"
        dialogTitle="${row.title}"
        @object:save="${e => this._handleEditSave(e, row)}"
        @object:cancel="${this._handleDialogCancel}"
      ></grampsjs-form-eventref>
    `
  }

  _handleEditSave(e, row) {
    const role = typeString(e.detail.data?.role)
    if (role && role !== row.roleValue) {
      this._fireChange({
        action: 'update',
        objectType: row.object_type,
        handle: row.handle,
        occurrence: row.occurrence,
        data: {role},
      })
    }
    this._closeDialog(e)
  }

  _handleDelete() {
    const row = this._selectedRow
    if (!row) {
      return
    }
    this._fireChange({
      action: 'remove',
      objectType: row.object_type,
      handle: row.handle,
      occurrence: row.occurrence,
    })
  }

  _closeDialog(e) {
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-participants', GrampsjsParticipants)
