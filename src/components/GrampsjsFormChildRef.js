/*
Form for adding a new event reference
*/

import {html} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'
import '@material/mwc-button'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormChildRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="person"
        .strings="${this.strings}"
        id="child-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
      <grampsjs-form-select-type
        required
        id="child-frel"
        heading="${this._('Relationship to _Father:').replace(':', '')}"
        .strings="${this.strings}"
        typeName="child_reference_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
      <grampsjs-form-select-type
        required
        id="child-mrel"
        heading="${this._('Relationship to _Mother:').replace(':', '')}"
        .strings="${this.strings}"
        typeName="child_reference_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-childref', GrampsjsFormChildRef)
