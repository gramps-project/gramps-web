/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import './GrampsjsAttributes.js'
import {GrampsjsObjectForm, changeRefAttributes} from './GrampsjsObjectForm.js'
import {
  participantIntroStyles,
  renderParticipantIntro,
} from './participantRow.js'

export {changeRefAttributes}

class GrampsjsFormEventRef extends GrampsjsObjectForm {
  static get styles() {
    return [...super.styles, ...participantIntroStyles]
  }

  static get properties() {
    return {
      defaultRole: {type: String},
      // the participant whose reference this edits, a row of
      // participantRefRows. Shows a sentence that the dialog
      // applies to this participant only, and editors for the privacy,
      // citations, notes and attributes of the reference.
      participant: {type: Object},
    }
  }

  constructor() {
    super()
    this.defaultRole = 'Primary'
    this.participant = null
  }

  renderForm() {
    return html`
      ${this.participant
        ? renderParticipantIntro(
            this.participant,
            this.appState,
            (...args) => this._(...args),
            {role: false}
          )
        : ''}
      ${!this.new // select event shown only for new event ref
        ? ''
        : html`
            <grampsjs-form-select-object-list
              fixedMenuPosition
              style="min-height: 300px;"
              objectType="event"
              .appState="${this.appState}"
              id="event-select"
              label="${this._('Select')}"
              class="edit"
              .data="${this.data}"
            ></grampsjs-form-select-object-list>
          `}
      <grampsjs-form-select-type
        required
        id="event-role-type"
        defaultValue="${this.defaultRole}"
        heading="${this._('Role')}"
        .appState="${this.appState}"
        typeName="event_role_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        value="${this.data?.role?.string || this.data?.role || ''}"
      >
      </grampsjs-form-select-type>
      ${this.participant
        ? html`${this._renderDetails()} ${this.renderPrivate()}`
        : ''}
    `
  }

  _renderDetails() {
    return html`
      ${this.renderRefCitationsAndNotes()} ${this.renderRefAttributes('events')}
    `
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-eventref', GrampsjsFormEventRef)
