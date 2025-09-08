import {html} from 'lit'

import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'

export const GrampsjsNewPersonMixin = superClass =>
  class extends superClass {
    gender = {
      2: 'Unknown',
      1: 'Male',
      0: 'Female',
    }

    renderForm() {
      return html`
        <h4 class="label">${this._('Name')}</h4>
        <grampsjs-form-name
          id="primary-name"
          .appState="${this.appState}"
        ></grampsjs-form-name>

        <h4 class="label">${this._('Gender')}</h4>
        <mwc-select id="select-confidence" @change="${this.handleGender}">
          ${Object.keys(this.gender).map(
            genderConst => html`
              <mwc-list-item
                value="${genderConst}"
                ?selected="${
                  // eslint-disable-next-line eqeqeq
                  genderConst == this.data.gender
                }"
                >${this._(this.gender[genderConst])}</mwc-list-item
              >
            `
          )}
        </mwc-select>

        <h4 class="label">${this._('Birth Date')}</h4>

        <p>
          <grampsjs-form-select-date
            id="birth-date"
            .appState="${this.appState}"
          >
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Birth Place')}</h4>

        <grampsjs-form-select-object-list
          id="birth-place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        <h4 class="label">${this._('Death Date')}</h4>

        <p>
          <grampsjs-form-select-date
            id="death-date"
            .appState="${this.appState}"
          >
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Death Place')}</h4>

        <grampsjs-form-select-object-list
          id="death-place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        ${this._renderCitationForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }

    _renderCitationForm() {
      return html`
        <h4 class="label">${this._('Citation')}</h4>

        <grampsjs-form-select-object-list
          multiple
          id="object-citation"
          objectType="citation"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>
      `
    }

    handleGender(e) {
      this.data = {...this.data, gender: parseInt(e.target.value, 10)}
    }
  }
