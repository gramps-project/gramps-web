/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {getSortval, dateIsEmpty} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

const modifiers = {
  0: 'Regular',
  1: 'Before',
  2: 'After',
  3: 'About',
  4: 'Range',
  5: 'Span',
  //  6: 'Text only'
}

const qualifiers = {
  0: 'Regular',
  1: 'Estimated',
  2: 'Calculated',
}

const dataDefault = {
  _class: 'Date',
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval: [0, 0, 0, false],
  sortval: 0,
}

function parseDate(s) {
  if (!s) {
    return [0, 0, 0]
  }
  const y = parseInt(s.substr(0, 4), 10) || 0
  const m = parseInt(s.substr(5, 2), 10) || 0
  const d = parseInt(s.substr(8, 2), 10) || 0
  return [y, m, d]
}

class GrampsjsFormSelectDate extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        p {
          margin: 7px 0;
        }

        mwc-icon-button {
          color: rgba(0, 0, 0, 0.5);
          --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.25);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      disabled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = dataDefault
    this.disabled = false
  }

  render() {
    return html`
    <p>
      <mwc-select
        id="select-modifier"
        label="${this._('Type')}"
        @change="${this.handleType}"
      >
        ${Object.keys(modifiers).map(
          modifier => html`
            <mwc-list-item
              value="${modifier}"
              ?selected="${
                // eslint-disable-next-line eqeqeq
                modifier == (this.data.modifier || 0)
              }"
              >${this._(modifiers[modifier])}</mwc-list-item
            >
          `
        )}
      </mwc-select>

    </p>
    <p>

      <mwc-textfield
        @change="${this.handleYear1}"
        id="year1"
        label="${this._('Year')}"
        type="number"
        style="width: 6em;"
        value="${this.data.dateval[2] || ''}"
      ></mwc-textfield>
      <mwc-select
        @change="${this.handleMonth1}"
        id="month1"
        label="${this._('Month')}"
        style="width: 6em;"
      >${[...Array(13).keys()].map(
        idx => html`
          <mwc-list-item
            value="${idx}"
            ?selected="${
              // eslint-disable-next-line eqeqeq
              idx == (this.data.dateval[1] || 0)
            }"
          >
            ${idx === 0 ? '' : idx}
          </mwc-list-item>
        `
      )}
      </mwc-select>
      <mwc-select
        @change="${this.handleDay1}"
        id="day1"
        label="${this._('Day')}"
        style="width: 6em;"
      >${[...Array(32).keys()].map(
        idx => html`
          <mwc-list-item
            value="${idx}"
            ?selected="${
              // eslint-disable-next-line eqeqeq
              idx == (this.data.dateval[0] || 0)
            }"
          >
            ${idx === 0 ? '' : idx}
          </mwc-list-item>
        `
      )}
      </mwc-select>

      <input
        type="date"
        id="input-date1"
        style="visibility: hidden; position: absolute;"
        @change="${this.handleDate1}"
      >
      </input>

      <mwc-icon-button
        icon="event"
        ?disabled="${this.data.calendar !== 0}"
        @click=${this._openDatePicker1}
      ></mwc-icon-button>
    </p>

      ${
        this._hasSecondDate()
          ? html`
      <p>&nbsp;&ndash;</p>
      <p>

      <mwc-textfield
        @change="${this.handleYear2}"
        id="year2"
        label="${this._('Year')}"
        type="number"
        style="width: 6em;"
        value="${this.data.dateval[6] || ''}"
      ></mwc-textfield>
      <mwc-select
        @change="${this.handleMonth2}"
        id="month2"
        label="${this._('Month')}"
        style="width: 6em;"
      >${[...Array(13).keys()].map(
        idx => html`
          <mwc-list-item
            value="${idx}"
            ?selected="${
              // eslint-disable-next-line eqeqeq
              idx == (this.data.dateval[5] || 0)
            }"
          >
            ${idx === 0 ? '' : idx}
          </mwc-list-item>
        `
      )}
      </mwc-select>
      <mwc-select
        @change="${this.handleDay2}"
        id="day2"
        label="${this._('Day')}"
        style="width: 6em;"
      >${[...Array(32).keys()].map(
        idx => html`
          <mwc-list-item
            value="${idx}"
            ?selected="${
              // eslint-disable-next-line eqeqeq
              idx == (this.data.dateval[4] || 0)
            }"
          >
            ${idx === 0 ? '' : idx}
          </mwc-list-item>
        `
      )}
      </mwc-select>

      <input
        type="date"
        id="input-date2"
        style="visibility: hidden; position: absolute;"
        @change="${this.handleDate2}"
      >
      </input>

      <mwc-icon-button
        ?disabled="${this.data.calendar !== 0}"
        icon="event"
        @click=${this._openDatePicker2}
      ></mwc-icon-button>
    </p>
      `
          : ''
      }


      <mwc-select
        id="select-quality"
        label="${this._('Quality')}"
        @change="${this.handleQuality}"
      >
        ${Object.keys(qualifiers).map(
          qualifier => html`
            <mwc-list-item
              value="${qualifier}"
              ?selected="${
                // eslint-disable-next-line eqeqeq
                qualifier == (this.data.quality || 0)
              }"
              >${this._(qualifiers[qualifier])}</mwc-list-item
            >
          `
        )}
      </mwc-select>
    </p>
      `
  }

  _hasSecondDate() {
    return this.data?.modifier >= 4
  }

  reset() {
    this.data = dataDefault
    this.shadowRoot.querySelectorAll('mwc-textfield').forEach(element => {
      // eslint-disable-next-line no-param-reassign
      element.value = ''
    })
    this.shadowRoot.querySelectorAll('mwc-select').forEach(element => {
      // eslint-disable-next-line no-param-reassign
      element.value = 0
    })
  }

  handleType(e) {
    this.data = {...this.data, modifier: parseInt(e.target.value, 10) || 0}
    // remove second date from dateval if necessary
    if (
      this._hasSecondDate() &&
      'dateval' in this.data &&
      this.data.dateval.length < 8
    ) {
      this.data = {
        ...this.data,
        dateval: [...this.data.dateval.slice(0, 4), 0, 0, 0, false],
      }
    }
    if (!this._hasSecondDate() && 'dateval' in this.data) {
      this.data = {...this.data, dateval: this.data.dateval.slice(0, 4)}
    }
    this.handleChange()
  }

  handleQuality(e) {
    this.data = {...this.data, quality: parseInt(e.target.value, 10) || 0}
    this.handleChange()
  }

  handleDate1(e) {
    const [y, m, d] = parseDate(e.target.value)
    const oldval = [...this.data?.dateval]
    this.data = {
      ...this.data,
      dateval: [d, m, y, false, ...oldval.slice(4)],
      sortval: getSortval(y, m, d),
      year: y,
    }
    this.handleChange()
  }

  handleDate2(e) {
    const [y, m, d] = parseDate(e.target.value)
    const oldval = [...this.data?.dateval]
    this.data = {...this.data, dateval: [...oldval.slice(0, 4), d, m, y, false]}
    this.handleChange()
  }

  _getValue1() {
    const val = [...this.data.dateval]
    if (val === null || val === undefined) {
      return null
    }
    const [d, m, y] = val.slice(0, 3)
    return `${`${y}`.padStart(4, '0')}-${`${m}`.padStart(
      2,
      '0'
    )}-${`${d}`.padStart(2, '0')}`
  }

  _getValue2() {
    const val = [...this.data.dateval]
    if (val === null || val === undefined || val.length < 6) {
      return null
    }
    const [d, m, y] = val.slice(4, 7)
    return `${`${y}`.padStart(4, '0')}-${`${m}`.padStart(
      2,
      '0'
    )}-${`${d}`.padStart(2, '0')}`
  }

  handleYear1(e) {
    const y = parseInt(e.target.value, 10) || 0
    const dateval = this.data?.dateval
      ? [...this.data.dateval]
      : [0, 0, 0, false]
    dateval[2] = y
    const m = dateval[1]
    const d = dateval[0]
    this.data = {
      ...this.data,
      dateval,
      sortval: getSortval(y, m, d),
      year: y,
    }
    this.handleChange()
  }

  handleMonth1(e) {
    const m = parseInt(e.target.value, 10) || 0
    const dateval = this.data?.dateval
      ? [...this.data.dateval]
      : [0, 0, 0, false]
    dateval[1] = m
    const y = dateval[2]
    const d = dateval[0]
    this.data = {
      ...this.data,
      dateval,
      sortval: getSortval(y, m, d),
    }
    this.handleChange()
  }

  handleDay1(e) {
    const d = parseInt(e.target.value, 10) || 0
    const dateval = this.data?.dateval
      ? [...this.data.dateval]
      : [0, 0, 0, false]
    dateval[0] = d
    const y = dateval[2]
    const m = dateval[1]
    this.data = {
      ...this.data,
      dateval,
      sortval: getSortval(y, m, d),
    }
    this.handleChange()
  }

  handleYear2(e) {
    const y = parseInt(e.target.value, 10) || 0
    const dateval =
      this.data.dateval && this.data.dateval.length > 4
        ? this.data.dateval.slice(4)
        : [0, 0, 0, false]
    dateval[2] = y
    const oldval = this.data?.dateval || [0, 0, 0, false]
    this.data = {...this.data, dateval: [...oldval.slice(0, 4), ...dateval]}
    this.handleChange()
  }

  handleDay2(e) {
    const d = parseInt(e.target.value, 10) || 0
    const dateval =
      this.data.dateval && this.data.dateval.length > 4
        ? this.data.dateval.slice(4)
        : [0, 0, 0, false]
    dateval[0] = d
    const oldval = this.data?.dateval || [0, 0, 0, false]
    this.data = {...this.data, dateval: [...oldval.slice(0, 4), ...dateval]}
    this.handleChange()
  }

  handleMonth2(e) {
    const m = parseInt(e.target.value, 10) || 0
    const dateval =
      this.data.dateval && this.data.dateval.length > 4
        ? this.data.dateval.slice(4)
        : [0, 0, 0, false]
    dateval[1] = m
    const oldval = this.data?.dateval
      ? [...this.data.dateval]
      : [0, 0, 0, false]
    this.data = {...this.data, dateval: [...oldval.slice(0, 4), ...dateval]}
    this.handleChange()
    this.handleChange()
  }

  handleChange() {
    this.dispatchEvent(
      new CustomEvent('formdata:changed', {
        bubbles: true,
        composed: true,
        detail: {data: this.data},
      })
    )
    this.renderRoot.getElementById('year1').reportValidity()
    const input1 = this.renderRoot.getElementById('input-date1')
    if (input1) {
      input1.value = this._getValue1()
    }
    const input2 = this.renderRoot.getElementById('input-date2')
    if (input2) {
      input2.value = this._getValue2()
    }
  }

  isValid() {
    // no dateval: invalid
    if (!this.data.dateval) {
      return false
    }
    // empty date: OK
    if (
      !this._hasSecondDate() &&
      this.data.dateval[0] === 0 &&
      this.data.dateval[1] === 0 &&
      this.data.dateval[2] === 0
    ) {
      return true
    }
    // second date > first date
    if (this._hasSecondDate()) {
      if (this.data.dateval.length < 8) {
        return false
      }
      // year 2 > year 1
      if (this.data.dateval[6] > this.data.dateval[2]) {
        return true
      }
      // year 2 < year 1
      if (this.data.dateval[6] < this.data.dateval[2]) {
        return false
      }
      // year 2 == year 1
      // month 2 > month 1
      if (this.data.dateval[5] > this.data.dateval[1]) {
        return true
      }
      // month 2 < month 1
      if (this.data.dateval[5] < this.data.dateval[1]) {
        return false
      }
      // month 2 == month 1
      // day 2 <= day 1
      if (this.data.dateval[4] <= this.data.dateval[0]) {
        return false
      }
    } else if (this.data.dateval.length > 4) {
      return false
    }
    return true
  }

  isEmpty() {
    return dateIsEmpty(this.data)
  }

  _openDatePicker1() {
    this.renderRoot.getElementById('input-date1').showPicker()
  }

  _openDatePicker2() {
    this.renderRoot.getElementById('input-date2').showPicker()
  }
}

window.customElements.define(
  'grampsjs-form-select-date',
  GrampsjsFormSelectDate
)
