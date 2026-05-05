import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'

class GrampsjsFormAddPersonToFamily extends GrampsjsObjectForm {
  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'family-select-list') {
      const [handle] = e.detail.data
      if (handle) {
        this.data = {...this.data, familyHandle: handle}
      } else {
        const {familyHandle, ...rest} = this.data
        this.data = rest
      }
    }
  }

  get isValid() {
    return !!this.data?.familyHandle
  }

  _handleDialogSave() {
    fireEvent(this, 'object:save', {data: this.data})
    this._reset()
  }

  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="family"
        .appState="${this.appState}"
        id="family-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
      <grampsjs-form-select-type
        required
        id="child-frel"
        heading="${this._('Relationship to _Father:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="child_reference_types"
        defaultValue="Birth"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      ></grampsjs-form-select-type>
      <grampsjs-form-select-type
        required
        id="child-mrel"
        heading="${this._('Relationship to _Mother:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="child_reference_types"
        defaultValue="Birth"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      ></grampsjs-form-select-type>
    `
  }
}

window.customElements.define(
  'grampsjs-form-add-person-to-family',
  GrampsjsFormAddPersonToFamily
)
