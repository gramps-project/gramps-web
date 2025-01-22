import {html, css, LitElement} from 'lit'
import {GrampsjsEditMatchMixin} from '../mixins/GrampsjsEditMatchMixin.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsFormEditMatch extends GrampsjsEditMatchMixin(
  GrampsjsTranslateMixin(LitElement)
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-outlined-text-field {
          width: 100%;
        }
      `,
    ]
  }

  get isValid() {
    return this.isFormValid
  }

  render() {
    return html`
      <div @formdata:changed="${this._handleFormData}">
        ${this.renderEditor()} ${this.renderPreview()}
      </div>
    `
  }

  _handleFormData(e) {
    this.data = {...this.data, raw_data: [e.detail.data]}
    this.checkFormValidity()
  }
}

window.customElements.define('grampsjs-form-edit-match', GrampsjsFormEditMatch)
