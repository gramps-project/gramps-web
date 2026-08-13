/*
Form for linking a child to a family, or for editing the parent
relationships (frel/mrel) of an existing child reference.
*/

import {html} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-button'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormChildRef extends GrampsjsObjectForm {
  // the form edits an existing reference if the data it was opened with
  // already points at a child; determined once, since selecting a person
  // sets `ref` on the data as well
  #isExistingRef = undefined

  willUpdate() {
    if (this.#isExistingRef === undefined) {
      this.#isExistingRef = Boolean(this.data?.ref)
    }
  }

  renderForm() {
    return html`
      ${this.#isExistingRef
        ? ''
        : html`
            <grampsjs-form-select-object-list
              fixedMenuPosition
              style="min-height: 300px;"
              objectType="person"
              .appState="${this.appState}"
              id="child-select"
              label="${this._('Select')}"
              class="edit"
            ></grampsjs-form-select-object-list>
          `}
      <grampsjs-form-select-type
        required
        id="child-frel"
        heading="${this._('Relationship to _Father:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="child_reference_types"
        defaultValue="Birth"
        .value="${this.data.frel || ''}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
      <grampsjs-form-select-type
        required
        id="child-mrel"
        heading="${this._('Relationship to _Mother:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="child_reference_types"
        defaultValue="Birth"
        .value="${this.data.mrel || ''}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-childref', GrampsjsFormChildRef)
