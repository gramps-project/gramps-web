/*
Form for linking an existing media object or for editing citations,
notes, attributes and privacy of an existing media link
*/

import {html} from 'lit'

import './GrampsjsFormSelectObjectList.js'
import './GrampsjsAttributes.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {participantIntroStyles} from './participantRow.js'

class GrampsjsFormMediaRef extends GrampsjsObjectForm {
  static get styles() {
    return [...super.styles, ...participantIntroStyles]
  }

  renderForm() {
    if (!this.new) {
      return html`
        <p class="intro">
          ${this._(
            'The information below applies to this media object on this page.'
          )}
        </p>
        ${this.renderRefCitationsAndNotes()}
        ${this.renderRefAttributes('media objects')} ${this.renderPrivate()}
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
