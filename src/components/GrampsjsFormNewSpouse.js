import {html} from 'lit'
import {GrampsjsFormNewPerson} from './GrampsjsFormNewPerson.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormSelectType.js'

export class GrampsjsFormNewSpouse extends GrampsjsFormNewPerson {
  _handleDialogSave() {
    const relType = this.data?.type
    const processedData = this._processedData()
    fireEvent(this, 'object:save', {data: {processedData, relType}})
    this._reset()
  }

  renderForm() {
    return html`
      ${super.renderForm()}
      <grampsjs-form-select-type
        id="family-rel-type"
        heading="${this._('Relationship type:').replace(':', '')}"
        .appState="${this.appState}"
        ?loadingTypes=${this.loadingTypes}
        typeName="family_relation_types"
        defaultValue="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      ></grampsjs-form-select-type>
    `
  }
}

window.customElements.define('grampsjs-form-new-spouse', GrampsjsFormNewSpouse)
