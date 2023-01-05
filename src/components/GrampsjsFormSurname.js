/*
element for editing a name
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'

import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormString.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

class GrampsjsFormSurname extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-textfield.fullwidth {
          width: 100%;
        }

        .hide {
          display: none;
        }

        mwc-icon-button {
          color: rgba(0, 0, 0, 0.5);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      showMore: {type: Boolean},
      idx: {type: Number},
      types: {type: Object},
      typesLocale: {type: Object},
      loadingTypes: {type: Boolean},
      origintype: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {_class: 'Name'}
    this.showMore = false
    this.idx = 0
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this.origintype = false
  }

  render() {
    return html`
      ${this.origintype
        ? html`
            <p class="${classMap({hide: !this.showMore})}">
              <grampsjs-form-select-type
                required
                noheading
                label="${this._('Surname origin type:').replace(':', '')}"
                id="surname-origin-type"
                .strings="${this.strings}"
                typeName="name_origin_types"
                defaultTypeName=""
                initialValue=${this.data?.origintype || ''}
                .types="${this.types}"
                .typesLocale="${this.typesLocale}"
                ?loadingTypes=${this.loadingTypes}
                @formdata:changed="${this._handleFormData}"
              >
              </grampsjs-form-select-type>
            </p>
          `
        : ''}
      <p class="${classMap({hide: !this.showMore})}">
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="prefix"
          value="${this.data.prefix || ''}"
          label="${this._('Prefix')}"
        ></grampsjs-form-string>
      </p>
      <p class="${classMap({hide: !this.showMore})}">
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="connector"
          value="${this.data.connector || ''}"
          label="${this._('Connector')}"
        ></grampsjs-form-string>
      </p>
      <p>
        <grampsjs-form-string
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="surname"
          value="${this.data.surname || ''}"
          label="${this._('Surname')}"
        ></grampsjs-form-string>
      </p>
    `
  }

  reset() {
    this.shadowRoot
      .querySelectorAll('grampsjs-form-string')
      .forEach(element => element.reset())
    this.shadowRoot
      .querySelectorAll('grampsjs-form-select-type')
      .forEach(element => element.reset())
    this.showMore = false
  }

  handleChange() {
    fireEvent(this, 'formdata:changed', {data: this.data, idx: this.idx})
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (['prefix', 'connector', 'surname'].includes(originalTarget.id)) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    } else if (originalTarget.id === 'surname-origin-type') {
      this.data = {...this.data, origintype: e.detail.data}
    }
    e.stopPropagation()
    this.handleChange()
  }
}

window.customElements.define('grampsjs-form-surname', GrampsjsFormSurname)
