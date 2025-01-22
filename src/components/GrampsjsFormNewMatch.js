import {html, css} from 'lit'

import './GrampsjsConnectedDnaMatchTable.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {GrampsjsEditMatchMixin} from '../mixins/GrampsjsEditMatchMixin.js'

export class GrampsjsFormNewMatch extends GrampsjsEditMatchMixin(
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
          flex-wrap: wrap;
          gap: 10px;
        }

        .box {
          flex: 1 1 300px;
          box-sizing: border-box;
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

  static get properties() {
    return {
      sourcePersonInitial: {type: Object},
    }
  }

  constructor() {
    super()
    this.sourcePersonInitial = {}
  }

  renderForm() {
    return html`
      <div class="container">
        <div class="box">
          <h4 class="label">${this._('First person')}</h4>
          <p>
            <grampsjs-form-select-object-list
              fixedMenuPosition
              notDeletable
              objectType="person"
              .strings="${this.strings}"
              id="match-source"
              label="${this._('Select')}"
              class="edit"
              .objectsInitial="${this.sourcePersonInitial.handle
                ? [
                    {
                      object: this.sourcePersonInitial,
                      object_type: 'person',
                      handle: this.sourcePersonInitial.handle,
                    },
                  ]
                : []}"
            ></grampsjs-form-select-object-list>
          </p>
        </div>
        <div class="box">
          <h4 class="label">${this._('Second person')}</h4>
          <p>
            <grampsjs-form-select-object-list
              fixedMenuPosition
              notDeletable
              objectType="person"
              .strings="${this.strings}"
              id="match-target"
              label="${this._('Select')}"
              class="edit"
            ></grampsjs-form-select-object-list>
          </p>
        </div>
      </div>

      ${this.renderEditor()} ${this.renderPreview()}
    `
  }
}

window.customElements.define('grampsjs-form-new-match', GrampsjsFormNewMatch)
