import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'

class GrampsjsFormNewPartnerFamily extends GrampsjsObjectForm {
  static get properties() {
    return {
      ...super.properties,
      personRole: {type: String},
      personHandle: {type: String},
    }
  }

  constructor() {
    super()
    this.personRole = 'father'
    this.personHandle = ''
  }

  get isValid() {
    const partnerHandle = this.data?.partner_handle
    if (
      this.personHandle &&
      partnerHandle &&
      partnerHandle === this.personHandle
    ) {
      return false
    }
    return true
  }

  get _partnerRole() {
    return this.personRole === 'father' ? 'mother' : 'father'
  }

  get _partnerLabel() {
    return this._partnerRole === 'father'
      ? this._('Select a person as the father')
      : this._('Select a person as the mother')
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'partner-list') {
      const [handle] = e.detail.data
      if (handle) {
        this.data = {...this.data, partner_handle: handle}
      } else {
        // eslint-disable-next-line no-unused-vars
        const {partner_handle: _ph, ...rest} = this.data
        this.data = rest
      }
    }
  }

  _handleDialogSave() {
    fireEvent(this, 'object:save', {
      data: {...this.data, role: this.personRole},
    })
    this._reset()
  }

  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="person"
        .appState="${this.appState}"
        id="partner"
        label="${this._partnerLabel}"
      ></grampsjs-form-select-object-list>

      <grampsjs-form-select-type
        id="family-rel-type"
        heading="${this._('Relationship type:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="family_relation_types"
        defaultValue="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      ></grampsjs-form-select-type>
    `
  }
}

window.customElements.define(
  'grampsjs-form-new-partner-family',
  GrampsjsFormNewPartnerFamily
)
