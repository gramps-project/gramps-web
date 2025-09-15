import {html, css} from 'lit'

import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsEditYDnaMixin} from '../mixins/GrampsjsEditYDnaMixin.js'

export class GrampsjsFormNewYDna extends GrampsjsEditYDnaMixin(
  GrampsjsObjectForm
) {
  static get styles() {
    return [
      super.styles,
      css`
        md-outlined-text-field {
          width: 100%;
        }

        .container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .box {
          padding: 10px;
        }
      `,
    ]
  }

  _handleFormData(e) {
    super._handleFormData(e)
    this.checkFormValidity()
  }

  get isValid() {
    return this.isFormValid
  }

  renderForm() {
    return html`
      <div class="container">
        <div class="box">
          <h4 class="label">${this._('Person')}</h4>
          <p>
            <grampsjs-form-select-object-list
              fixedMenuPosition
              notDeletable
              objectType="person"
              .appState="${this.appState}"
              id="ydna-person"
              label="${this._('Select person')}"
              class="edit"
            ></grampsjs-form-select-object-list>
          </p>
        </div>
      </div>

      ${this.renderEditor()}
    `
  }

  checkFormValidity() {
    const personSelect = this.renderRoot.querySelector('#ydna-person')
    const personList = personSelect?.renderRoot.querySelector(
      'grampsjs-form-object-list'
    )
    const hasPersonSelected = personList?.objects?.length > 0

    // Call the mixin's checkFormValidity to validate the data
    super.checkFormValidity()

    // Override the result to also require person selection
    this.isFormValid = !!(hasPersonSelected && this.isFormValid)
  }

  reset() {
    super.reset()

    const personSelect = this.renderRoot.querySelector('#ydna-person')
    if (personSelect) {
      personSelect.reset()
    }
  }

  getSelectedPerson() {
    const personSelect = this.renderRoot.querySelector('#ydna-person')
    const personList = personSelect?.renderRoot.querySelector(
      'grampsjs-form-object-list'
    )
    return personList?.objects?.[0]?.object || null
  }
}

window.customElements.define('grampsjs-form-new-ydna', GrampsjsFormNewYDna)
