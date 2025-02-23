/*
Form for adding a new event reference
*/

import {html} from 'lit'

import './GrampsjsFormSelectDate.js'
import './GrampsjsFormSelectObjectList.js'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

class GrampsjsFormEditFamily extends GrampsjsObjectForm {
  static get properties() {
    return {
      father: {type: Object},
      mother: {type: Object},
      fatherProfile: {type: Object},
      motherProfile: {type: Object},
    }
  }

  constructor() {
    super()
    this.father = {}
    this.mother = {}
    this.fatherProfile = {}
    this.motherProfile = {}
  }

  renderForm() {
    return html`
      <h4 class="label">${this._('Father')}</h4>

      <grampsjs-form-select-object-list
        id="father"
        objectType="person"
        label="${this._('Select a person as the father')}"
        .appState="${this.appState}"
        .objectsInitial="${this.data.father_handle
          ? [
              {
                object_type: 'person',
                object: {
                  ...this.father,
                  profile: this.fatherProfile,
                },
                handle: this.data.father_handle,
              },
            ]
          : []}"
        class="edit"
      ></grampsjs-form-select-object-list>

      <h4 class="label">${this._('Mother')}</h4>

      <grampsjs-form-select-object-list
        id="mother"
        objectType="person"
        label="${this._('Select a person as the mother')}"
        .appState="${this.appState}"
        .objectsInitial="${this.data.mother_handle
          ? [
              {
                object_type: 'person',
                object: {
                  ...this.mother,
                  profile: this.motherProfile,
                },
                handle: this.data.mother_handle,
              },
            ]
          : []}"
        class="edit"
      ></grampsjs-form-select-object-list>

      <grampsjs-form-select-type
        id="family-rel-type"
        heading="${this._('Relationship type:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="family_relation_types"
        defaultTypeName="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        initialValue=${this.data?.type?.string || this.data?.type || ''}
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define(
  'grampsjs-form-edit-family',
  GrampsjsFormEditFamily
)
