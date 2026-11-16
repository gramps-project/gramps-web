/*
Form for linking a child to a family, or for editing the parent
relationships (frel/mrel) of an existing child reference.
*/

import {html} from 'lit'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {participantIntroStyles} from './participantRow.js'

class GrampsjsFormChildRef extends GrampsjsObjectForm {
  static get styles() {
    return [...super.styles, ...participantIntroStyles]
  }

  static get properties() {
    return {
      // hide the switch for the privacy of the reference, where picking a
      // person would make it read as the person's privacy
      noPrivate: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.noPrivate = false
  }

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
        ? html`<p class="intro">
            ${this._(
              'The information below applies to this child in this family.'
            )}
          </p>`
        : ''}
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
      ${this.#isExistingRef ? this.renderRefCitationsAndNotes() : ''}
      ${this.noPrivate ? '' : this.renderPrivate()}
    `
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-childref', GrampsjsFormChildRef)
