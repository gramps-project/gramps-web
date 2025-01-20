import {html} from 'lit'

import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

const gender = {
  2: 'Unknown',
  1: 'Male',
  0: 'Female',
}

export const GrampsjsNewPersonMixin = superClass =>
  class extends superClass {
    handleGender(e) {
      this.data = {...this.data, gender: parseInt(e.target.value, 10)}
    }

    renderForm() {
      return html`
        <h4 class="label">${this._('Name')}</h4>
        <grampsjs-form-name
          id="primary-name"
          .strings="${this.strings}"
        ></grampsjs-form-name>

        <h4 class="label">${this._('Gender')}</h4>
        <mwc-select id="select-confidence" @change="${this.handleGender}">
          ${Object.keys(gender).map(
            genderConst => html`
              <mwc-list-item
                value="${genderConst}"
                ?selected="${
                  // eslint-disable-next-line eqeqeq
                  genderConst == this.data.gender
                }"
                >${this._(gender[genderConst])}</mwc-list-item
              >
            `
          )}
        </mwc-select>

        <h4 class="label">${this._('Birth Date')}</h4>

        <p>
          <grampsjs-form-select-date id="birth-date" .strings="${this.strings}">
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Birth Place')}</h4>

        <grampsjs-form-select-object-list
          id="birth-place"
          objectType="place"
          .strings="${this.strings}"
        ></grampsjs-form-select-object-list>

        <h4 class="label">${this._('Death Date')}</h4>

        <p>
          <grampsjs-form-select-date id="death-date" .strings="${this.strings}">
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Death Place')}</h4>

        <grampsjs-form-select-object-list
          id="death-place"
          objectType="place"
          .strings="${this.strings}"
        ></grampsjs-form-select-object-list>

        ${this._renderCitationForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .strings="${this.strings}"
        ></grampsjs-form-private>
      `
    }
  }
