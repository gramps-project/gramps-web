import {html} from 'lit'
import {GrampsjsFormPersonRef} from './GrampsjsFormPersonRef.js'
import './GrampsjsFormSelectType.js'

class GrampsjsFormSpouseRef extends GrampsjsFormPersonRef {
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

window.customElements.define('grampsjs-form-spouseref', GrampsjsFormSpouseRef)
