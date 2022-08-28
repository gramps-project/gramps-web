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

class GrampsjsFormRepoRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="repository"
        .strings="${this.strings}"
        id="repository-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>

      <h4 class="label">${this._('Call Number')}</h4>
      <p>
        <grampsjs-form-string
          fullwidth
          id="call_number"
          value="${this.data.call_number}"
        ></grampsjs-form-string>
      </p>

      <grampsjs-form-select-type
        required
        id="source-media-type"
        heading="${this._('Type')}"
        .strings="${this.strings}"
        typeName="source_media_types"
        defaultTypeName="Book"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-reporef', GrampsjsFormRepoRef)
