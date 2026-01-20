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
  static get properties() {
    return {
      repoRefKey: {type: String},
      repoData: {type: Object},
    }
  }

  constructor() {
    super()
    this.repoRefKey = ''
    this.repoData = {}
  }

  renderForm() {
    const selectOption = [
      {
        handle: this.repoRefKey,
        object: this.repoData,
        object_type: 'repository',
      },
    ]
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="repository"
        .appState="${this.appState}"
        id="repository-select"
        label="${this._('Select')}"
        class="edit"
        .objectsInitial="${selectOption}"
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
        .appState="${this.appState}"
        typeName="source_media_types"
        ?loadingTypes=${this.loadingTypes}
        defaultValue="Book"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        .value="${this.data.media_type}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-reporef', GrampsjsFormRepoRef)
