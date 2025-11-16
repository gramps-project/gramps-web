import {html} from 'lit'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

export class GrampsjsFormNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsObjectForm
) {
  _handleDialogSave() {
    const {frel, mrel} = this.data
    const processedData = this._processedData()

    const data = {
      processedData,
      frel,
      mrel,
    }

    fireEvent(this, 'object:save', {data})
    this._reset()
  }

  renderForm() {
    return html`
      ${super.renderForm()}

      <grampsjs-form-select-type
        required
        id="child-frel"
        heading="${this._('Relationship to _Father:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="child_reference_types"
        defaultValue="Birth"
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
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-new-person', GrampsjsFormNewPerson)
