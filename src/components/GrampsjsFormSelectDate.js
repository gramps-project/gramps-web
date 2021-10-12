/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'

import {sharedStyles} from '../SharedStyles.js'
import {getSortval} from '../util.js'

const modifiers = {
  0: 'Regular',
  1: 'Before',
  2: 'After',
  3: 'About',
  4: 'Range',
  5: 'Span'
//  6: 'Text only'
}

const qualifiers = {
  0: 'Regular',
  1: 'Estimated',
  2: 'Calculated'
}

const dataDefault = {
  _class: 'Date',
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval: [0, 0, 0, false],
  sortval: 0
}

function parseDate (s) {
  if (!s) {
    return [0, 0, 0]
  }
  const y = parseInt(s.substr(0, 4), 10)
  const m = parseInt(s.substr(5, 2), 10)
  const d = parseInt(s.substr(8, 2), 10)
  return [y, m, d]
}

class GrampsjsFormSelectDate extends LitElement {
  static get styles () {
    return [
      sharedStyles,
      css`
      `
    ]
  }

  static get properties () {
    return {
      strings: {type: Object},
      data: {type: Object},
      disabled: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.strings = {}
    this.data = dataDefault
    this.disabled = false
  }

  render () {
    return html`
    <mwc-select
      id="select-modifier"
      label="${this._('Type')}"
      @change="${this.handleType}"
    >
      ${Object.keys(modifiers).map(modifier => html`
      <mwc-list-item
        value="${modifier}"
        ?selected="${modifier == (this.data.modifier || 0)}"
      >${this._(modifiers[modifier])}</mwc-list-item>
      `)}
    </mwc-select>

    <mwc-textfield
      @change="${this.handleDate1}"
      id="date1"
      label="${this._('Date')}"
      type="date"
      value="${this._getValue1()}"
      iconTrailing="event"
    ></mwc-textfield>

    <mwc-textfield
      @change="${this.handleDate2}"
      id="date2"
      label="${this._('Second date')}"
      min="${this._getMinDate()}"
      type="date"
      ?disabled="${!this._hasSecondDate()}"
      iconTrailing="event"
    ></mwc-textfield>

    <mwc-select
      id="select-quality"
      label="${this._('Quality')}"
      @change="${this.handleQuality}"
    >
    ${Object.keys(qualifiers).map(qualifier => html`
    <mwc-list-item
      value="${qualifier}"
      ?selected="${qualifier == (this.data.quality || 0)}"
    >${this._(qualifiers[qualifier])}</mwc-list-item>
    `)}
  </mwc-select>
    `
  }

  _getValue1 () {
    const val = this.data.dateval
    if (val === null || val === undefined) {
      return
    }
    const [d, m, y] = val.slice(0, 3)
    return `${y}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`
  }

  _getMinDate () {
    const el = this.shadowRoot.getElementById('date1')
    if (el !== null) {
      return el.value
    }
    return ''
  }

  _hasSecondDate () {
    return this.data?.modifier >= 4
  }

  reset () {
    this.data = dataDefault
    const date1 = this.shadowRoot.getElementById('date1')
    date1.value = ''
    const date2 = this.shadowRoot.getElementById('date2')
    date2.value = ''
    date2.min = ''
  }

  handleType (e) {
    this.data = {...this.data, modifier: parseInt(e.target.value, 10)}
    // remove second date from dateval if necessary
    if (!this._hasSecondDate() && 'dateval' in this.data) {
      this.shadowRoot.getElementById('date2').value = ''
      this.data = {...this.data, dateval: this.data.dateval.slice(0, 4)}
    }
    this.handleChange()
  }

  handleQuality (e) {
    this.data = {...this.data, quality: parseInt(e.target.value, 10)}
    this.handleChange()
  }

  handleDate1 (e) {
    const [y, m, d] = parseDate(e.target.value)
    const oldval = this.data?.dateval || []
    this.data = {
      ...this.data,
      dateval: [d, m, y, false, ...oldval.slice(4)],
      sortval: getSortval(y, m, d),
      year: y
    }
    this.handleChange()
  }

  handleDate2 (e) {
    const [y, m, d] = parseDate(e.target.value)
    const oldval = this.data?.dateval || []
    this.data = {...this.data, dateval: [...oldval.slice(0, 4), d, m, y, false]}
    this.handleChange()
  }

  handleChange () {
    this.dispatchEvent(new CustomEvent('formdata:changed', {bubbles: true, composed: true, detail: {data: this.data}}))
  }

  _ (s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }
}

window.customElements.define('grampsjs-form-select-date', GrampsjsFormSelectDate)
