/*
Dialog for editing an event from the page of a person or family linked to it.

It edits the event's own fields. Roles are edited in the event's list of
participants. If others are linked to the event too, the fields start as a
read-only summary with the participants, and become editable only after the
user chooses to edit the event for everyone.

On save, it fires `object:save` with `data`, the changed event fields, or
null if nothing changed.
*/

import {html, css} from 'lit'
import '@material/web/button/outlined-button.js'
import '@material/web/progress/linear-progress.js'

import './GrampsjsParticipants.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsNewEventMixin} from '../mixins/GrampsjsNewEventMixin.js'
import {emptyDate, fireEvent, typeString} from '../util.js'

const EVENT_FIELDS = ['type', 'date', 'description', 'place']

function eventFieldValues(event) {
  return {
    type: typeString(event?.type),
    date: event?.date ?? emptyDate,
    description: event?.description || '',
    place: event?.place || '',
  }
}

// initial form data for an event
export function eventInContextData(event) {
  return eventFieldValues(event)
}

// the changed event fields, or null if nothing changed
export function eventInContextChanges(data, event) {
  const original = eventFieldValues(event)
  const edited = eventFieldValues(data)
  const changed = EVENT_FIELDS.filter(
    key => JSON.stringify(edited[key]) !== JSON.stringify(original[key])
  )
  return changed.length
    ? Object.fromEntries(changed.map(key => [key, edited[key]]))
    : null
}

// whether people or families other than the owner are linked to the event
export function hasOtherParticipants(participants, ownerHandle) {
  return [
    ...(participants?.people || []).map(obj => obj.person),
    ...(participants?.families || []).map(obj => obj.family),
  ].some(profile => profile?.handle && profile.handle !== ownerHandle)
}

class GrampsjsFormEditEventInContext extends GrampsjsNewEventMixin(
  GrampsjsObjectForm
) {
  static get styles() {
    return [
      ...super.styles,
      css`
        .event-box {
          background-color: var(--md-sys-color-surface-container-highest);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .event-box h3.label:first-child {
          margin-top: 0;
        }

        .summary span {
          display: block;
        }

        .summary .secondary {
          color: var(--grampsjs-body-font-color-60);
        }

        .event-box grampsjs-participants {
          --md-list-container-color: transparent;
        }

        .actions {
          text-align: right;
        }
      `,
    ]
  }

  static get properties() {
    return {
      event: {type: Object},
      ownerHandle: {type: String},
      _eventProfile: {type: Object},
      _loaded: {type: Boolean},
      _editEvent: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.event = {}
    this.ownerHandle = ''
    this._eventProfile = null
    this._loaded = false
    this._editEvent = false
  }

  willUpdate(changed) {
    super.willUpdate?.(changed)
    if (changed.has('event')) {
      this.data = eventInContextData(this.event)
    }
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchEventProfile()
  }

  async _fetchEventProfile() {
    const handle = this.event?.handle
    if (!handle) {
      this._loaded = true
      return
    }
    const data = await this.appState.apiGet(
      `/api/events/${handle}?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=participants&keys=profile`
    )
    if (handle !== this.event?.handle) {
      return
    }
    // without a profile, the event fields are shown editable
    this._eventProfile = 'data' in data ? data.data?.profile || null : null
    this._loaded = true
  }

  get _isShared() {
    return hasOtherParticipants(
      this._eventProfile?.participants,
      this.ownerHandle
    )
  }

  renderForm() {
    return this._renderEventSection()
  }

  _renderEventSection() {
    if (!this._loaded) {
      return html`<md-linear-progress indeterminate></md-linear-progress>`
    }
    if (!this._isShared) {
      return this.renderEventFields()
    }
    if (this._editEvent) {
      return html`
        <div class="event-box">${this._renderParticipants()}</div>
        ${this.renderEventFields()}
      `
    }
    return html`
      <div class="event-box">
        <h3 class="label">${this._('Event')}</h3>
        ${this._renderSummary()} ${this._renderParticipants()}
        <div class="actions">
          <md-outlined-button
            @click="${() => {
              this._editEvent = true
            }}"
            >${this._('Edit for everyone')}</md-outlined-button
          >
        </div>
      </div>
    `
  }

  _renderSummary() {
    const profile = this._eventProfile || {}
    const place = profile.place_name || profile.place || ''
    const description = this.event?.description || ''
    return html`
      <p class="summary">
        <span>${[profile.type, profile.date].filter(Boolean).join(' · ')}</span>
        ${place ? html`<span class="secondary">${place}</span>` : ''}
        ${description
          ? html`<span class="secondary">${description}</span>`
          : ''}
      </p>
    `
  }

  _renderParticipants() {
    return html`
      <h3 class="label">${this._('Participants')}</h3>
      <grampsjs-participants
        noLink
        .appState="${this.appState}"
        .data=${[this._eventProfile?.participants]}
      ></grampsjs-participants>
    `
  }

  get isValid() {
    return !!typeString(this.data?.type) && this._areDateSelectValid()
  }

  _handleDialogSave() {
    fireEvent(this, 'object:save', {
      data: eventInContextChanges(this.data, this.event),
    })
  }
}

window.customElements.define(
  'grampsjs-form-edit-event-in-context',
  GrampsjsFormEditEventInContext
)
