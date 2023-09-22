/*
Form for editing an attribute
*/

import {html} from 'lit'

import './GrampsjsFormString.js'
import './GrampsjsFormSelectType.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditAssociation extends GrampsjsObjectForm {
  static get properties() {
    return {
      person: {type: Object},
      personProfile: {type: Object},
    }
  }

  constructor() {
    super()
    this.person = {}
    this.personProfile = {}
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Person')}</h4>
      <p>
        <grampsjs-form-select-object-list
          fixedMenuPosition
          style="min-height: 300px;"
          objectType="person"
          .strings="${this.strings}"
          id="person-select"
          label="${this._('Select')}"
          .objectsInitial="${this.data.ref
            ? [
                {
                  object_type: 'person',
                  object: this.person,
                  handle: this.data.ref,
                },
              ]
            : []}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>

      <p>
        <grampsjs-form-string
          required
          fullwidth
          id="rel"
          @formdata:changed="${this._handleFormData}"
          label="${this._('Association')}"
          .strings="${this.strings}"
          .data="${this.data}"
          value="${this.data?.rel || ''}"
        >
        </grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Citations')}</h4>
      <p>
        <grampsjs-form-select-object-list
          multiple
          fixedMenuPosition
          style="min-height: 300px;"
          objectType="citation"
          .strings="${this.strings}"
          id="personref-citation-select"
          label="${this._('Select')}"
          .objectsInitial="${this.data.citation_list &&
          this.data.citation_list.length
            ? this.data.citation_list.map(handle => ({
                object_type: 'citation',
                object: {},
                handle,
              }))
            : []}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>

      <h4 class="label">${this._('Notes')}</h4>
      <p>
        <grampsjs-form-select-object-list
          multiple
          fixedMenuPosition
          style="min-height: 300px;"
          objectType="note"
          .strings="${this.strings}"
          id="personref-note-select"
          label="${this._('Select')}"
          .objectsInitial="${this.data.note_list && this.data.note_list.length
            ? this.data.note_list.map(handle => ({
                object_type: 'note',
                object: {},
                handle,
              }))
            : []}"
          class="edit"
        ></grampsjs-form-select-object-list>
      </p>
    `
  }

  get isValid() {
    return this.data.rel && this.data.ref
  }
}

window.customElements.define(
  'grampsjs-form-edit-association',
  GrampsjsFormEditAssociation
)
