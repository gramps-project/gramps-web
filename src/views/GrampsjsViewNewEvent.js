import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textfield'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewEventMixin} from '../mixins/GrampsjsNewEventMixin.js'
import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

export class GrampsjsViewNewEvent extends GrampsjsNewEventMixin(
  GrampsjsViewNewObject
) {
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

      ${this.renderForm()} ${this.renderButtons()}
    `
  }

  handleDesc(e) {
    this.data = {...this.data, description: e.target.value.trim()}
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'event-type') {
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
