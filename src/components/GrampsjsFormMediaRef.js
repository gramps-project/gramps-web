/*
Form for linking an existing media object or for editing citations,
notes and attributes of an existing media link
*/

import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import './GrampsjsAttributes.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {participantIntroStyles, renderRowIntro} from './participantRow.js'

class GrampsjsFormMediaRef extends GrampsjsObjectForm {
  static get styles() {
    return [...super.styles, ...participantIntroStyles]
  }

  static get properties() {
    return {
      intro: {type: String},
      summary: {type: Object},
    }
  }

  constructor() {
    super()
    this.intro = ''
    this.summary = ''
  }

  renderForm() {
    if (!this.new) {
      return html`
        ${renderRowIntro(this.intro, this.summary)}
        ${this.renderRefCitationsAndNotes()}
        ${this.renderRefAttributes('media objects')}
      `
    }
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="media"
        .appState="${this.appState}"
        id="media-select"
        label="${this._('Select')}"
        class="edit"
      ></grampsjs-form-select-object-list>
    `
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-mediaref', GrampsjsFormMediaRef)
