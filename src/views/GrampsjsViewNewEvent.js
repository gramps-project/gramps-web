import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textfield'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

export class GrampsjsViewNewEvent extends GrampsjsViewNewObject {
  constructor() {
    super()
    this.data = {_class: 'Event'}
    this.postUrl = '/api/events/'
    this.itemPath = 'event'
    this.objClass = 'Event'
  }

  renderContent() {
    return html`
      <h2>${this._('New Event')}</h2>

      <grampsjs-form-select-type
        required
        id="select-type"
        .strings="${this.strings}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="event_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      <h4 class="label">${this._('Date')}</h4>
      <p>
        <grampsjs-form-select-date id="date" .strings="${this.strings}">
        </grampsjs-form-select-date>
      </p>

      <h4 class="label">${this._('Description')}</h4>
      <p>
        <mwc-textfield
          style="width:100%;"
          @input="${this.handleDesc}"
          id="desc"
        ></mwc-textfield>
      </p>

      <h4 class="label">${this._('Place')}</h4>
      <grampsjs-form-select-object-list
        id="place"
        objectType="place"
        .strings="${this.strings}"
      ></grampsjs-form-select-object-list>

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .strings="${this.strings}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleDesc(e) {
    this.data = {...this.data, description: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-type') {
      this.data = {
        ...this.data,
        type: {_class: 'EventType', string: e.detail.data},
      }
    }
    if (originalTarget.id === 'place-list') {
      this.data = {...this.data, place: e.detail.data[0]}
    }
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data}
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
    if (!selectType !== null && !selectType.isValid()) {
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

  _reset() {
    super._reset()
    // this.data = {_class: 'Event'}
  }
}

window.customElements.define('grampsjs-view-new-event', GrampsjsViewNewEvent)
