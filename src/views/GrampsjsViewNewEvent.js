import {html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import {mdiAccountPlus, mdiDelete, mdiStar} from '@mdi/js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewEventMixin} from '../mixins/GrampsjsNewEventMixin.js'
import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormParticipantRef.js'
import '../components/GrampsjsIcon.js'

import {emptyDate, objectIconPath, makeHandle, fireEvent} from '../util.js'
import '../components/GrampsjsImg.js'

const PRIMARY_ROLES_EN = new Set(['Primary', 'Family'])

export class GrampsjsViewNewEvent extends GrampsjsNewEventMixin(
  GrampsjsViewNewObject
) {
  static get styles() {
    return [
      super.styles,
      css`
        .role-star {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        span[slot='supporting-text'] {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .object-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--grampsjs-color-icon-background);
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _participants: {type: Array},
      _showParticipantDialog: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {_class: 'Event'}
    this.postUrl = '/api/events/'
    this.itemPath = 'event'
    this.objClass = 'Event'
    this._participants = []
    this._showParticipantDialog = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Event')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
  }

  _renderCitationForm() {
    return html`
      ${this._renderParticipantsSection()} ${super._renderCitationForm()}
    `
  }

  _isPrimaryRole(role) {
    return PRIMARY_ROLES_EN.has(role)
  }

  _renderParticipantsSection() {
    return html`
      <h3>${this._('Participants')}</h3>

      ${this._participants.length
        ? html`
            <md-list>
              ${this._participants.map(
                (p, i) => html`
                  <md-list-item type="text">
                    ${p.label}
                    <span slot="supporting-text">
                      ${this._isPrimaryRole(p.role?.string || p.role || '')
                        ? html`<grampsjs-icon
                            class="role-star"
                            path="${mdiStar}"
                            color="currentColor"
                          ></grampsjs-icon>`
                        : ''}
                      ${this._(p.role?.string || p.role || '')}
                    </span>
                    ${p.backlink?.media_list?.length
                      ? html`<grampsjs-img
                          handle="${p.backlink.media_list[0].ref}"
                          slot="start"
                          circle
                          square
                          size="40"
                          .rect="${p.backlink.media_list[0].rect}"
                          mime=""
                          fallbackIcon="${objectIconPath[p.object_type] || ''}"
                        ></grampsjs-img>`
                      : html`<div slot="start" class="object-icon">
                          <grampsjs-icon
                            path="${objectIconPath[p.object_type] || ''}"
                            color="var(--grampsjs-color-icon)"
                          ></grampsjs-icon>
                        </div>`}
                    <md-icon-button
                      slot="end"
                      @click="${() => this._removeParticipant(i)}"
                    >
                      <grampsjs-icon
                        path="${mdiDelete}"
                        color="var(--mdc-theme-secondary)"
                      ></grampsjs-icon>
                    </md-icon-button>
                  </md-list-item>
                `
              )}
            </md-list>
          `
        : ''}

      <p>
        <md-outlined-button @click="${this._handleAddParticipant}">
          <grampsjs-icon
            slot="icon"
            path="${mdiAccountPlus}"
            color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
          ></grampsjs-icon>
          ${this._('Add Participant')}
        </md-outlined-button>
      </p>

      ${this._showParticipantDialog
        ? html`
            <grampsjs-form-participant-ref
              .appState="${this.appState}"
              dialogTitle="${this._('Add Participant')}"
              @object:save="${this._handleParticipantSave}"
              @object:cancel="${this._handleParticipantCancel}"
            ></grampsjs-form-participant-ref>
          `
        : ''}
    `
  }

  _handleAddParticipant() {
    this._showParticipantDialog = true
  }

  _handleParticipantSave(e) {
    // eslint-disable-next-line camelcase
    const {ref, object_type: objectType, label, role, backlink} = e.detail.data
    if (ref && objectType) {
      const roleStr =
        typeof role === 'string' ? role : role?.string || 'Primary'
      const roleObj = {_class: 'EventRoleType', string: roleStr}
      this._participants = [
        ...this._participants,
        {handle: ref, object_type: objectType, label, role: roleObj, backlink},
      ]
    }
    this._showParticipantDialog = false
    e.preventDefault()
    e.stopPropagation()
  }

  _handleParticipantCancel(e) {
    this._showParticipantDialog = false
    e.preventDefault()
    e.stopPropagation()
  }

  _removeParticipant(i) {
    this._participants = this._participants.filter((_, idx) => idx !== i)
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'event-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'place-list') {
      this.data = {...this.data, place: e.detail.data[0]}
    }
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data ?? emptyDate}
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
    let valid = true
    if (selectType !== null && !selectType.isValid()) {
      valid = false
    }
    const selectDate = this.shadowRoot.querySelector(
      'grampsjs-form-select-date'
    )
    if (!selectDate !== null && !selectDate.isValid()) {
      valid = false
    }
    this.isFormValid = valid
  }

  async _submit() {
    const eventHandle = makeHandle()
    const data = await this.appState.apiPost(this.postUrl, {
      ...this.data,
      handle: eventHandle,
    })
    if (!('data' in data)) {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
      return
    }

    this.error = false

    let anyRefAdded = false
    for (const p of this._participants) {
      const endpoint = p.object_type === 'family' ? 'families' : 'people'
      // eslint-disable-next-line no-await-in-loop
      const ok = await this._addEventRef(p.handle, endpoint, {
        _class: 'EventRef',
        ref: eventHandle,
        role: p.role,
      })
      if (ok) anyRefAdded = true
    }
    if (anyRefAdded) {
      fireEvent(window, 'db:changed')
    }

    const eventObj = data.data.find(obj => obj.new._class === 'Event')
    if (!eventObj) return
    const {gramps_id: grampsId} = eventObj.new

    fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
    this._reset()
  }

  async _addEventRef(handle, endpoint, eventRef) {
    const resp = await this.appState.apiGet(`/api/${endpoint}/${handle}`)
    if (!('data' in resp)) {
      fireEvent(this, 'grampsjs:error', {
        message: resp.error || `Failed to fetch ${endpoint}/${handle}`,
      })
      return false
    }
    const {extended, profile, backlinks, formatted, ...objData} = resp.data
    objData.event_ref_list = [...(objData.event_ref_list || []), eventRef]
    const putResp = await this.appState.apiPut(
      `/api/${endpoint}/${handle}`,
      objData,
      {dbChanged: false}
    )
    if ('error' in putResp) {
      fireEvent(this, 'grampsjs:error', {message: putResp.error})
      return false
    }
    return true
  }

  _reset() {
    super._reset()
    this._participants = []
    this._showParticipantDialog = false
  }
}

window.customElements.define('grampsjs-view-new-event', GrampsjsViewNewEvent)
