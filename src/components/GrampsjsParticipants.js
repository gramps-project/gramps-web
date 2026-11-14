import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiInformation} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsImg.js'
import './GrampsjsIcon.js'
import './GrampsjsFormEventRef.js'
import './GrampsjsFormParticipantRef.js'
import './GrampsjsRefDetails.js'
import {
  personTitleFromProfile,
  familyTitleFromProfile,
  fireEvent,
  typeString,
  objectIconPath,
} from '../util.js'
import {rowPrivacy} from '../objectRender.js'
import {renderParticipantRowContent} from './participantRow.js'

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
      refPrivate: !!ref?.private,
      citations: ref?.citation_list ?? [],
      notes: ref?.note_list ?? [],
      attributes: ref?.attribute_list ?? [],
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

const REF_LISTS = {
  citation_list: 'citations',
  note_list: 'notes',
  attribute_list: 'attributes',
}

/*
The fields of a participant's reference that the edit dialog changed, or
null if it changed none. An empty role keeps the stored one.
*/
export function participantRefChanges(data, row) {
  const changes = {}
  const role = typeString(data.role)
  if (role && role !== row.roleValue) {
    changes.role = role
  }
  if (!!data.private !== row.refPrivate) {
    changes.private = !!data.private
  }
  Object.entries(REF_LISTS).forEach(([key, rowKey]) => {
    if (
      key in data &&
      JSON.stringify(data[key] ?? []) !== JSON.stringify(row[rowKey] ?? [])
    ) {
      changes[key] = data[key] ?? []
    }
  })
  return Object.keys(changes).length ? changes : null
}

export class GrampsjsParticipants extends GrampsjsEditableList {
  static get styles() {
    return [
      super.styles,
      css`
        button.ref-counts {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: none;
          border-radius: 16px;
          background: none;
          font: inherit;
          font-size: 14px;
          color: var(--grampsjs-body-font-color-60);
          cursor: pointer;
        }

        button.ref-counts:hover,
        button.ref-counts:focus-visible {
          background-color: var(--grampsjs-body-font-color-5);
        }

        button.ref-counts span + grampsjs-icon {
          margin-left: 6px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      backlinksPeople: {type: Array},
      backlinksFamilies: {type: Array},
      eventHandle: {type: String},
      eventTitle: {type: String},
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
    this.eventTitle = ''
    this.noLink = false
  }

  _isPrimaryRole(role) {
    return (
      PRIMARY_ROLES_EN.has(role) ||
      role === this._('Primary') ||
      role === this._('Family')
    )
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

  get _rowType() {
    if (this.edit) {
      return 'button'
    }
    return this.noLink ? 'text' : 'link'
  }

  row(obj, i) {
    const type = this._rowType
    return html`
      <md-list-item
        type="${type}"
        href="${type === 'link' ? `/${obj.path}` : ''}"
        class="${classMap({selected: this.edit && i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${renderParticipantRowContent(obj, this.appState, (...args) =>
          this._(...args)
        )}
        ${this._renderRefCounts(obj, i)}
      </md-list-item>
    `
  }

  // counts of the citations, notes and attributes of the reference, as a
  // button that opens them
  _renderRefCounts(obj, i) {
    const counts = [
      [objectIconPath.citation, obj.citations.length],
      [objectIconPath.note, obj.notes.length],
      [mdiInformation, obj.attributes.length],
    ].filter(([, n]) => n > 0)
    if (counts.length === 0) {
      return ''
    }
    return html`
      <button
        slot="end"
        class="ref-counts"
        aria-label="${this._('Details')}"
        title="${this._('Details')}"
        @click="${e => this._handleRefCountsClick(e, obj, i)}"
      >
        ${counts.map(
          ([path, n]) => html`<grampsjs-icon
              path="${path}"
              color="currentColor"
              height="16"
              width="16"
            ></grampsjs-icon
            ><span>${n}</span>`
        )}
      </button>
    `
  }

  _handleRefCountsClick(e, obj, i) {
    // the row is a link to the participant
    e.preventDefault()
    e.stopPropagation()
    if (this.edit) {
      this._selectedIndex = i
      this._handleEdit()
      return
    }
    this.dialogContent = html`
      <grampsjs-ref-details
        .appState="${this.appState}"
        dialogTitle="${this.eventTitle}"
        .participant="${obj}"
        .citations="${obj.citations}"
        .notes="${obj.notes}"
        .attributes="${obj.attributes}"
        @object:cancel="${this._handleDialogCancel}"
      ></grampsjs-ref-details>
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
        .participant="${row}"
        .data="${{
          ref: this.eventHandle,
          role: row.roleValue,
          private: row.refPrivate,
          citation_list: row.citations,
          note_list: row.notes,
          attribute_list: row.attributes,
        }}"
        dialogTitle="${this.eventTitle}"
        @object:save="${e => this._handleEditSave(e, row)}"
        @object:cancel="${this._handleDialogCancel}"
      ></grampsjs-form-eventref>
    `
  }

  _handleEditSave(e, row) {
    const data = participantRefChanges(e.detail.data, row)
    if (data) {
      this._fireChange({
        action: 'update',
        objectType: row.object_type,
        handle: row.handle,
        occurrence: row.occurrence,
        data,
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
