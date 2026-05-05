import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {fireEvent} from '../util.js'

class GrampsjsFormNewParentFamily extends GrampsjsObjectForm {
  get isValid() {
    return true
  }

  _handleDialogSave() {
    fireEvent(this, 'object:save', {data: this.data})
    this._reset()
  }

  renderForm() {
    return html`
      <h4>${this._('Father')}</h4>
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 200px;"
        objectType="person"
        .appState="${this.appState}"
        id="father"
        label="${this._('Select a person as the father')}"
      ></grampsjs-form-select-object-list>

      <h4>${this._('Mother')}</h4>
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 200px;"
        objectType="person"
        .appState="${this.appState}"
        id="mother"
        label="${this._('Select a person as the mother')}"
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
  'grampsjs-form-new-parent-family',
  GrampsjsFormNewParentFamily
)
