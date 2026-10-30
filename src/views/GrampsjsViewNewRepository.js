import {html} from 'lit'

import '@material/web/textfield/filled-text-field.js'
import '@material/mwc-button'
import '@material/mwc-circular-progress'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsFormObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import {reportRequiredField} from '../util.js'

export class GrampsjsViewNewRepository extends GrampsjsViewNewObject {
  constructor() {
    super()
    this.data = {_class: 'Repository'}
    this.postUrl = '/api/repositories/'
    this.itemPath = 'repository'
    this.objClass = 'Repository'
  }

  renderContent() {
    return html`
      <h2>${this._('New Repository')}</h2>

      <h3 class="label">${this._('Name')}</h3>
      <p>
        <md-filled-text-field
          required
          supporting-text="&nbsp;"
          style="width:100%;"
          @input="${this.handleName}"
          @blur="${this.handleName}"
          id="repository-name"
        ></md-filled-text-field>
      </p>

      <grampsjs-form-select-type
        required
        id="select-repository-type"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="repository_types"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
    reportRequiredField(e.target, this._('This field is mandatory'))
    this.checkFormValidity()
    this.data = {...this.data, name: e.target.value.trim()}
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'select-repository-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    this.checkFormValidity()
  }

  checkFormValidity() {
    const selectType = this.shadowRoot.querySelector(
      'grampsjs-form-select-type'
    )
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

window.customElements.define(
  'grampsjs-view-new-repository',
  GrampsjsViewNewRepository
)
