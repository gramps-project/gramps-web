import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'

const dataDefault = {_class: 'Family'}

export class GrampsjsViewNewFamily extends GrampsjsViewNewObject {
  constructor () {
    super()
    this.data = dataDefault
    this.postUrl = '/api/families/'
    this.itemPath = 'family'
    this.objClass = 'Family'
  }

  renderContent () {
    return html`
    <h2>${this._('New Family')}</h2>

    <h4 class="label">${this._('Father')}</h4>

    <grampsjs-form-select-object-list
      id="father"
      objectType="person"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>


    <h4 class="label">${this._('Mother')}</h4>

    <grampsjs-form-select-object-list
      id="mother"
      objectType="person"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>


    <h4 class="label">${this._('Children')}</h4>

    <grampsjs-form-select-object-list
      multiple
      id="children"
      objectType="person"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>


    <div class="spacer"></div>
    <grampsjs-form-private id="private" .strings="${this.strings}"></grampsjs-form-private>

    ${this.renderButtons()}
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleGender (e) {
    this.data = {...this.data, gender: parseInt(e.target.value, 10)}
  }

  _handleFormData (e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'father-list') {
      this.data = {...this.data, father_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'mother-list') {
      this.data = {...this.data, mother_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'children-list') {
      this.data = {
        ...this.data,
        child_ref_list: e.detail.data.map(handle => (
          {_class: 'ChildRef', ref: handle}
        ))
      }
    }
    this.checkFormValidity()
  }

  checkFormValidity () {
    this.isFormValid = true
  }

  _reset () {
    super._reset()
    this.data = dataDefault
  }
}

window.customElements.define('grampsjs-view-new-family', GrampsjsViewNewFamily)
