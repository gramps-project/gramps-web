/*
Element for editing a Gramps date
*/

import {html, css, LitElement} from 'lit'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import {mdiCalendar, mdiChevronDown} from '@mdi/js'

import './GrampsjsIcon.js'
import './GrampsjsChipChoice.js'
import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {dateIsEmpty, emptyDate, fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {CALENDARS} from '../gcalendar.js'
import {
  dateToEditorState,
  editorStateToDate,
  parseDateField,
  rowsAfterKindSwitch,
  validateEditorState,
} from '../dateEditor.js'

const kindLabels = {
  regular: 'Regular',
  about: 'About',
  before: 'Before',
  after: 'After',
  range: 'Range',
  fromto: 'Span',
}

// Labels of the date rows of each kind, so that the form shows what the
// selected chip means
const rowLabels = {
  regular: ['Date'],
  about: ['About'],
  before: ['Before'],
  after: ['After'],
  range: ['Earliest', 'Latest'],
  fromto: ['From', 'To'],
}

// Explains each kind but the default one
const kindHints = {
  about: 'A single date somewhere around this one',
  before: 'A single date some time before this one',
  after: 'A single date some time after this one',
  range: 'A single date somewhere in this range',
  fromto:
    'The whole time from the first date to the second. Either can be left empty.',
}

const qualifiers = {
  0: 'Regular',
  1: 'Estimated',
  2: 'Calculated',
}

const calendars = {
  [CALENDARS.GREGORIAN]: 'Gregorian',
  [CALENDARS.JULIAN]: 'Julian',
  [CALENDARS.HEBREW]: 'Hebrew',
  [CALENDARS.FRENCH]: 'French Republican',
  [CALENDARS.PERSIAN]: 'Persian',
  [CALENDARS.ISLAMIC]: 'Islamic',
  [CALENDARS.SWEDISH]: 'Swedish',
}

const dataDefault = {...emptyDate}

function parseIsoDate(s) {
  if (!s) {
    return [0, 0, 0]
  }
  const y = parseInt(s.substr(0, 4), 10) || 0
  const m = parseInt(s.substr(5, 2), 10) || 0
  const d = parseInt(s.substr(8, 2), 10) || 0
  return [y, m, d]
}

function rowToIsoDate(row) {
  const [d, m, y] = row
  if (!y || !m || !d) {
    return ''
  }
  return `${`${y}`.padStart(4, '0')}-${`${m}`.padStart(
    2,
    '0'
  )}-${`${d}`.padStart(2, '0')}`
}

function fieldValue(n) {
  return Number.isNaN(n) || !n ? '' : `${n}`
}

const ROW_SIZE = 3

class GrampsjsFormSelectDate extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
      css`
        :host {
          display: block;
        }

        md-icon-button {
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-50);
          --grampsjs-icon-button-disabled-color: var(
            --grampsjs-body-font-color-25
          );
          --grampsjs-icon-button-disabled-opacity: 1;
        }

        grampsjs-chip-choice {
          display: block;
          margin: 8px 0 16px;
        }

        /* Material's label style, also used by the chips and text buttons */
        .row-label {
          font-family: var(
            --md-sys-typescale-label-large-font,
            var(--md-ref-typeface-plain, Roboto)
          );
          font-size: var(--md-sys-typescale-label-large-size, 0.875rem);
          line-height: var(--md-sys-typescale-label-large-line-height, 1.25rem);
          font-weight: var(
            --md-sys-typescale-label-large-weight,
            var(--md-ref-typeface-weight-medium, 500)
          );
          color: var(--md-sys-color-on-surface-variant);
          margin: 0 0 6px;
        }

        /* Explains the selected chip, in the style of the supporting text of
           list items */
        .hint {
          font-family: var(
            --md-sys-typescale-body-medium-font,
            var(--md-ref-typeface-plain, Roboto)
          );
          font-size: var(--md-sys-typescale-body-medium-size, 0.875rem);
          line-height: var(--md-sys-typescale-body-medium-line-height, 1.25rem);
          font-weight: var(
            --md-sys-typescale-body-medium-weight,
            var(--md-ref-typeface-weight-regular, 400)
          );
          color: var(--grampsjs-body-font-color-50);
          margin: -8px 0 16px;
        }

        .row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .row .year {
          width: 6.5em;
        }

        .row .month,
        .row .day {
          width: 5em;
        }

        input[type='date'] {
          visibility: hidden;
          position: absolute;
        }

        md-text-button.more grampsjs-icon {
          transition: transform 0.2s ease;
        }

        md-text-button.more.open grampsjs-icon {
          transform: rotate(180deg);
        }

        .more-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 8px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      disabled: {type: Boolean},
      _kind: {state: true},
      _rows: {state: true},
      _moreOpen: {state: true},
    }
  }

  constructor() {
    super()
    this.data = dataDefault
    this.disabled = false
    this._kind = 'regular'
    this._rows = [
      [0, 0, 0, false],
      [0, 0, 0, false],
    ]
    this._moreOpen = false
    // The last date this element fired, so that it is not read back into
    // the editor state when the parent passes it down again
    this._emitted = null
    // The text typed into each field, so that re-rendering never replaces
    // what the user is typing, e.g. an incomplete number
    this._typed = [Array(ROW_SIZE).fill(null), Array(ROW_SIZE).fill(null)]
  }

  willUpdate(changed) {
    if (changed.has('data') && JSON.stringify(this.data) !== this._emitted) {
      this._syncFromData()
    }
  }

  _syncFromData() {
    const {kind, rows} = dateToEditorState(this.data)
    this._kind = kind
    this._rows = rows
    this._clearTyped(0)
    this._clearTyped(1)
    if (this.data?.quality || this.data?.calendar) {
      this._moreOpen = true
    }
  }

  render() {
    const {rowErrors} = validateEditorState(this.data, this._kind, this._rows)
    return html`
      <grampsjs-chip-choice
        .ariaLabel="${this._('Type')}"
        .options="${Object.entries(kindLabels).map(([value, label]) => ({
          value,
          label: this._(label),
        }))}"
        .selected="${this._kind}"
        @chip-choice:change="${this._handleKind}"
      ></grampsjs-chip-choice>
      ${kindHints[this._kind]
        ? html`<p class="hint">${this._(kindHints[this._kind])}</p>`
        : ''}
      ${(rowLabels[this._kind] ?? [null]).map(
        (label, index) => html`
          ${label ? html`<p class="row-label">${this._(label)}</p>` : ''}
          ${this._renderRow(index, rowErrors[index])}
        `
      )}
      <md-text-button
        class="more ${this._moreOpen ? 'open' : ''}"
        trailing-icon
        aria-expanded="${this._moreOpen}"
        @click="${this._toggleMore}"
      >
        ${this._('More options')}
        <grampsjs-icon
          slot="icon"
          path="${mdiChevronDown}"
          color="currentColor"
        ></grampsjs-icon>
      </md-text-button>
      ${this._moreOpen ? this._renderMore() : ''}
    `
  }

  _renderRow(index, error) {
    const [d, m, y] = this._rows[index].map(
      (n, position) => this._typed[index][position] ?? fieldValue(n)
    )
    return html`
      <div class="row">
        <md-filled-text-field
          class="year"
          label="${this._('Year')}"
          type="number"
          inputmode="numeric"
          .value="${y}"
          ?error="${error}"
          @input="${e => this._handleField(index, 2, e)}"
        ></md-filled-text-field>
        <md-filled-text-field
          class="month"
          label="${this._('Month')}"
          type="number"
          inputmode="numeric"
          min="1"
          max="${this.data?.calendar === CALENDARS.FRENCH ||
          this.data?.calendar === CALENDARS.HEBREW
            ? 13
            : 12}"
          .value="${m}"
          ?error="${error}"
          @input="${e => this._handleField(index, 1, e)}"
        ></md-filled-text-field>
        <md-filled-text-field
          class="day"
          label="${this._('Day')}"
          type="number"
          inputmode="numeric"
          min="1"
          max="31"
          .value="${d}"
          ?error="${error}"
          @input="${e => this._handleField(index, 0, e)}"
        ></md-filled-text-field>
        <input
          type="date"
          id="input-date${index}"
          .value="${rowToIsoDate(this._rows[index])}"
          @change="${e => this._handlePicker(index, e)}"
        />
        <md-icon-button
          aria-label="${this._('Select date')}"
          ?disabled="${(this.data?.calendar ?? 0) !== CALENDARS.GREGORIAN}"
          @click="${() => this._openPicker(index)}"
        >
          <grampsjs-icon
            path="${mdiCalendar}"
            color="currentColor"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _renderMore() {
    return html`
      <div class="more-fields">
        <md-filled-select
          id="select-quality"
          label="${this._('Quality')}"
          @change="${this._handleQuality}"
        >
          ${Object.keys(qualifiers).map(
            qualifier => html`
              <md-select-option
                value="${qualifier}"
                ?selected="${Number(qualifier) === (this.data?.quality || 0)}"
              >
                <div slot="headline">${this._(qualifiers[qualifier])}</div>
              </md-select-option>
            `
          )}
        </md-filled-select>
        <md-filled-select
          id="select-calendar"
          label="${this._('Calendar')}"
          @change="${this._handleCalendar}"
        >
          ${Object.keys(calendars).map(
            calendar => html`
              <md-select-option
                value="${calendar}"
                ?selected="${Number(calendar) === (this.data?.calendar || 0)}"
              >
                <div slot="headline">
                  ${this._p('calendar', calendars[calendar])}
                </div>
              </md-select-option>
            `
          )}
        </md-filled-select>
      </div>
    `
  }

  _handleKind(e) {
    const kind = e.detail.value
    const rows = rowsAfterKindSwitch(this._kind, kind, this._rows)
    if (rows !== this._rows) {
      this._typed = [this._typed[1], this._typed[0]]
    }
    this._updateDate(kind, rows)
  }

  _clearTyped(index) {
    this._typed[index] = Array(ROW_SIZE).fill(null)
  }

  _handleField(index, position, e) {
    const rows = this._rows.map(row => [...row])
    rows[index][position] = parseDateField(
      e.target.value,
      e.target.validity?.badInput
    )
    this._typed[index][position] = e.target.value
    // Editing a text-only date turns it into a regular one
    this._updateDate(this._kind ?? 'regular', rows)
  }

  _handlePicker(index, e) {
    const [y, m, d] = parseIsoDate(e.target.value)
    const rows = this._rows.map(row => [...row])
    rows[index] = [d, m, y, rows[index][3]]
    this._clearTyped(index)
    this._updateDate(this._kind ?? 'regular', rows)
  }

  _openPicker(index) {
    this.renderRoot.getElementById(`input-date${index}`).showPicker()
  }

  _toggleMore() {
    this._moreOpen = !this._moreOpen
  }

  _handleQuality(e) {
    this._emit({
      ...(this.data ?? dataDefault),
      quality: parseInt(e.target.value, 10) || 0,
    })
  }

  _handleCalendar(e) {
    this._emit({
      ...(this.data ?? dataDefault),
      calendar: parseInt(e.target.value, 10) || 0,
    })
  }

  _updateDate(kind, rows) {
    this._kind = kind
    this._rows = rows
    this._emit(editorStateToDate(this.data ?? dataDefault, kind, rows))
  }

  _emit(data) {
    this.data = data
    this._emitted = JSON.stringify(data)
    fireEvent(this, 'formdata:changed', {data})
  }

  reset() {
    this.data = dataDefault
    this._emitted = null
    this._syncFromData()
    this._moreOpen = false
  }

  isValid() {
    return validateEditorState(this.data, this._kind, this._rows).valid
  }

  isEmpty() {
    return dateIsEmpty(this.data)
  }
}

window.customElements.define(
  'grampsjs-form-select-date',
  GrampsjsFormSelectDate
)
