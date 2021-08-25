import {html} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textfield'
import '@material/mwc-formfield'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsFormObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'


export class GrampsjsViewNewRepository extends GrampsjsViewNewObject {

  constructor() {
    super()
    this.data = {_class: 'Repository'}
    this.postUrl = '/api/repositories/'
    this.itemPath = 'repository'
  }

  renderContent() {
    return html`
    <h2>${this._('New Repository')}</h2>

    <h4 class="label">${this._('Name')}</h4>
    <p>
      <mwc-textfield
        required
        validationMessage="${this._('This field is mandatory')}"
        style="width:100%;"
        @input="${this.handleName}"
        id="repository-name"
      ></mwc-textfield>
    </p>

    <grampsjs-form-select-type
      required
      id="select-repository-type"
      .strings="${this.strings}"
      ?loadingTypes="${this.loadingTypes}"
      ?disabled="${this.loadingTypes}"
      typeName="repository_types"
      .types="${this.types}"
      .typesLocale="${this.typesLocale}"
      >
    </grampsjs-form-select-type>

    <div class="spacer"></div>
    <grampsjs-form-private
      id="private"
      .strings="${this.strings}"
    ></grampsjs-form-private>

    ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, name: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-repository-type') {
      this.data = {...this.data, type: {_class: 'RepositoryType', string: e.detail.data}}
    }
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector('grampsjs-form-select-type')
    this.isFormValid = selectType === null ? true : selectType.isValid()
    const repoName = this.shadowRoot.getElementById('repository-name')
    try {
      this.isFormValid = this.isFormValid && repoName?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    super._reset()
    this.data = {_class: 'Repository'}
  }
}


window.customElements.define('grampsjs-view-new-repository', GrampsjsViewNewRepository)
