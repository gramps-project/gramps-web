import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormEditEventDetails.js'
import './GrampsjsFormEditTitle.js'
import './GrampsjsTooltip.js'
import {fireEvent, emptyDate} from '../util.js'

const BASE_DIR = ''

export class GrampsjsEvent extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._objectsName = 'Events'
    this._objectIcon = 'event'
    this._objectEndpoint = 'events'
    this._showReferences = false
  }

  renderProfile() {
    return html`
      <h2>
        ${this._renderTitle()}
        ${this.edit
          ? html`
              <mwc-icon-button
                id="btn-edit-type"
                icon="edit"
                class="edit"
                @click="${this._handleEditType}"
              ></mwc-icon-button>
              <grampsjs-tooltip for="btn-edit-type"
                >${this._('Edit event type')}</grampsjs-tooltip
              >
            `
          : ''}
      </h2>
      ${this.data.description || this.edit
        ? html` <dl>
            <div>
              <dt>${this._('Description')}</dt>
              <dd>${this.data.description}</dd>
            </div>
          </dl>`
        : ''}
      ${this.edit
        ? html`
            <mwc-icon-button
              icon="edit"
              class="edit"
              @click="${this._handleEditDesc}"
            ></mwc-icon-button>
          `
        : ''}

      <dl style="clear:left;">
        ${this.data?.profile?.date || this.edit
          ? html`
              <div>
                <dt>${this._('Date')}</dt>
                <dd>${this.data.profile.date}</dd>
              </div>
            `
          : ''}
        ${this.data?.profile?.place || this.edit
          ? html`
              <div>
                <dt>${this._('Place')}</dt>
                <dd>
                  <a
                    href="${BASE_DIR}/place/${this.data.extended.place
                      .gramps_id}"
                    >${this.data.profile.place}</a
                  >
                </dd>
              </div>
            `
          : ''}
      </dl>
      ${this.edit
        ? html`
            <mwc-icon-button
              icon="edit"
              class="edit"
              @click="${this._handleEditDetails}"
            ></mwc-icon-button>
          `
        : ''}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderPerson(obj) {
    if (obj === undefined) {
      return ''
    }
    return `${obj?.name_given || '…'} ${obj?.name_surname || '…'}`
  }

  // eslint-disable-next-line class-methods-use-this
  _renderFamily(obj) {
    if (obj === undefined) {
      return ''
    }
    return `${this._renderPerson(obj.family?.father)} & ${this._renderPerson(
      obj.family?.mother
    )}`
  }

  _renderPrimaryPeople() {
    const primary = this._('Primary')
    const family = this._('Family')
    const people =
      this.data?.profile?.participants?.people.filter(
        obj => obj.role === primary || obj.role === 'Primary'
      ) || []
    const families =
      this.data?.profile?.participants?.families.filter(
        obj => obj.role === family || obj.role === 'Family'
      ) || []
    return `${people
      .map(obj => this._renderPerson(obj.person), this)
      .join(', ')}
            ${families.map(obj => this._renderFamily(obj), this).join(', ')}`
  }

  _renderTitle() {
    if (
      !this.data?.profile?.participants?.people?.length &&
      !this.data?.profile?.participants?.families?.length
    ) {
      // event without participants
      return html`${this.data.profile.type}`
    }
    return html`${this.data.profile.type}: ${this._renderPrimaryPeople()}`
  }

  _handleEditDetails() {
    const data = {date: this.data.date ?? emptyDate}
    if (this.data.place) {
      data.place = this.data.place
    }
    const place = this.data?.extended?.place
    this.dialogContent = html`
      <grampsjs-form-edit-event-details
        @object:save="${this._handleSaveDetails}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${data}
        .place=${place}
      >
      </grampsjs-form-edit-event-details>
    `
  }

  _handleSaveDetails(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEditDesc() {
    this.dialogContent = html`
      <grampsjs-form-edit-title
        @object:save="${this._handleSaveDesc}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{description: this.data?.description || ''}}
        prop="description"
      >
      </grampsjs-form-edit-title>
    `
  }

  _handleSaveDesc(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEditType() {
    this.dialogContent = html`
      <grampsjs-form-edit-type
        dialogTitle="${this._('Edit event type')}"
        formId="event-type"
        typeName="event_types"
        @object:save="${this._handleSaveType}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{
          type: this.data?.type?.string || this.data?.type || '',
        }}
        prop="value"
      >
      </grampsjs-form-edit-type>
    `
  }
}

window.customElements.define('grampsjs-event', GrampsjsEvent)
