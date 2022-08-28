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

class GrampsjsFormNoteRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="note"
        .strings="${this.strings}"
        id="note-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
    </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-noteref', GrampsjsFormNoteRef)
