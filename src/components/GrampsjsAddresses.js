import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiMapMarker} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditAddress.js'
import './GrampsjsIcon.js'

import {dateIsEmpty, fireEvent} from '../util.js'
import {toDate} from '../date.js'

import '@material/web/list/list-item.js'

// The address properties making up the one-line summary, in display order.
const summaryFields = [
  'street',
  'locality',
  'city',
  'county',
  'state',
  'postal',
  'country',
]

export class GrampsjsAddresses extends GrampsjsEditableList {
  static get properties() {
    return {
      profile: {type: Array},
    }
  }

  constructor() {
    super()
    this.profile = []
    this.hasEdit = true
    this.objType = 'Address'
  }

  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'text'}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        ${summaryFields
          .map(key => obj[key])
          .filter(value => value)
          .join(', ')}
        ${this._supportingText(obj, i)}
        <grampsjs-icon
          slot="start"
          path="${mdiMapMarker}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  // The phone number and the date the address was current, each on its own
  // line below the address. Omitted entirely when the address has neither.
  _supportingText(obj, i) {
    const date = this._dateString(obj, i)
    if (!obj.phone && !date) {
      return ''
    }
    return html`
      <span slot="supporting-text"
        >${obj.phone}${obj.phone && date ? html`<br />` : ''}${date}</span
      >
    `
  }

  // Date to show for the address at the given index. Prefers the string
  // formatted by the API, which honours modifiers, calendars and locale.
  //
  // The fallback formats the raw date, for backends predating
  // https://github.com/gramps-project/gramps-web-api/pull/949, which added
  // addresses to the profile of every object type that has them. It can be
  // removed once the minimum supported backend includes that change.
  _dateString(obj, i) {
    const dateStr = this.profile[i]?.date_str
    if (dateStr !== undefined) {
      return dateStr
    }
    return obj?.date?.dateval && !dateIsEmpty(obj.date)
      ? toDate(obj.date.dateval)
      : ''
  }

  _handleAdd() {
    const data = {_class: 'Address'}
    this.dialogContent = html`
      <grampsjs-form-edit-address
        new
        dialogTitle="${this._('Address')}"
        @object:save="${this._handleAddressSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
      >
      </grampsjs-form-edit-address>
    `
  }

  _handleEdit() {
    const data = {...this.data[this._selectedIndex]}
    this.dialogContent = html`
      <grampsjs-form-edit-address
        dialogTitle="${this._('Address')}"
        @object:save="${this._handleAddressSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
      >
      </grampsjs-form-edit-address>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delAddress',
      index: this._selectedIndex,
    })
  }

  _handleAddressSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addAddress',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleAddressSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateAddress',
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
}

window.customElements.define('grampsjs-addresses', GrampsjsAddresses)
