import {LitElement, css, html} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/switch/switch'
import '@material/web/textfield/filled-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {
  fireEvent,
  reportSelectItemLabel,
  reportSelectItemValue,
} from '../util.js'

const _forbiddenOptions = ['css', 'of', 'style']

export class GrampsjsReportOptions extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .option {
          display: grid;
          grid-template-columns: 20em minmax(0, 40em);
          column-gap: 1em;
          align-items: start;
          margin-bottom: 1em;
        }

        .label {
          font-size: 16px;
          line-height: 24px;
          /* first line level with the text inside the 56px fields */
          padding-top: 16px;
        }

        .boolean .label {
          padding-top: 0;
        }

        .boolean md-switch {
          margin-top: 1px;
        }

        .form {
          min-width: 0;
        }

        md-filled-text-field,
        md-filled-select {
          width: 100%;
          min-width: 0;
        }

        md-switch {
          --md-switch-track-height: 22px;
          --md-switch-track-width: 38px;
          --md-switch-handle-height: 16px;
          --md-switch-handle-width: 16px;
          --md-switch-selected-handle-height: 16px;
          --md-switch-selected-handle-width: 16px;
          --md-switch-pressed-handle-height: 18px;
          --md-switch-pressed-handle-width: 18px;
        }

        @media (max-width: 768px) {
          .option {
            grid-template-columns: minmax(0, 1fr);
            row-gap: 0.5em;
          }

          .label {
            padding-top: 0;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      optionsDict: {type: Array},
      optionsHelp: {type: Array},
      _options: {type: Object},
    }
  }

  constructor() {
    super()
    this.optionsDict = []
    this.optionsHelp = []
    this._options = {}
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    if (changed.has('optionsDict') && Object.keys(this.optionsDict).length) {
      // Reset and re-populate whenever optionsDict changes (i.e. a different
      // report is opened) so values from a previous report don't leak through.
      // Every rendered option gets the value the form shows, so the backend
      // generates exactly what the user sees.
      const defaults = {}
      this._optionKeys().forEach(key => {
        defaults[key] = this._defaultValue(key)
      })
      this._options = defaults
      fireEvent(this, 'report-options:changed', this._options)
    }
  }

  render() {
    return html` ${this._optionKeys().map(key => this._renderOption(key))} `
  }

  _optionKeys() {
    return Object.keys(this.optionsDict).filter(
      key => !_forbiddenOptions.includes(key)
    )
  }

  _optionType(key) {
    const choices = this.optionsHelp[key]?.[2]
    if (!Array.isArray(choices)) {
      return 'string'
    }
    if (
      choices.length === 2 &&
      choices.includes('False') &&
      choices.includes('True')
    ) {
      return 'boolean'
    }
    return 'select'
  }

  // All values are strings because the API requires them.
  _defaultValue(key) {
    const val = this.optionsDict[key]
    const type = this._optionType(key)
    if (type === 'boolean') {
      return `${val}`.toLowerCase() === 'true' ? 'True' : 'False'
    }
    if (type === 'select') {
      // Some defaults are not among the choices (e.g. `off` defaults to
      // "print"), so fall back to PDF or the first choice.
      const values = this.optionsHelp[key][2].map(reportSelectItemValue)
      if (key === 'trans' && `${val}` === 'default') {
        const uiLanguage = this._uiLanguageChoice(values)
        if (uiLanguage) {
          return uiLanguage
        }
      }
      if (values.includes(`${val}`)) {
        return `${val}`
      }
      return values.includes('pdf') ? 'pdf' : values[0] ?? ''
    }
    // Array-valued defaults (e.g. father_disp) must be sent to the
    // backend as bracket-notation strings so Gramps can parse them.
    return Array.isArray(val) ? JSON.stringify(val) : String(val ?? '')
  }

  // The report translation choice matching the UI language, falling back
  // from a regional variant (e.g. de_AT) to the base language.
  _uiLanguageChoice(values) {
    const lang = this.appState?.i18n?.lang
    if (!lang) {
      return ''
    }
    if (values.includes(lang)) {
      return lang
    }
    const base = lang.split('_')[0]
    return values.includes(base) ? base : ''
  }

  _label(key) {
    const description = this.optionsHelp[key]?.[1]
    return description ? this._(description) : key
  }

  _renderOption(key) {
    const type = this._optionType(key)
    if (type === 'boolean') {
      return this._renderBooleanOption(key)
    }
    if (type === 'select') {
      return this._renderArrayOption(key)
    }
    return this._renderStringOption(key)
  }

  _renderBooleanOption(key) {
    return html`
      <div class="option boolean">
        <span class="label">${this._label(key)}</span>
        <span class="form">
          <md-switch
            id="${key}"
            ?selected="${this._options[key] === 'True'}"
            @change="${this._handleSwitch}"
          >
          </md-switch>
        </span>
      </div>
    `
  }

  _renderArrayOption(key) {
    return html`
      <div class="option">
        <span class="label">${this._label(key)}</span>
        <span class="form">
          <md-filled-select id="${key}" @change="${this._handleSelect}">
            ${this.optionsHelp[key][2].map(item =>
              this._renderSelectItem(item, this._options[key])
            )}
          </md-filled-select>
        </span>
      </div>
    `
  }

  _renderStringOption(key) {
    const label = this._label(key)
    const help = this.optionsHelp[key]?.[2]
    const helper = typeof help === 'string' ? help : ''
    return html`
      <div class="option">
        <span class="label">${label}</span>
        <span class="form">
          <md-filled-text-field
            @input="${this._handleText}"
            id="${key}"
            .value="${String(this._options[key] ?? '')}"
            supporting-text="${this._(helper)}"
            type="${helper.includes('A number') ? 'number' : 'text'}"
            step="any"
          ></md-filled-text-field>
        </span>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSelectItem(key, value) {
    const itemValue = reportSelectItemValue(key)
    const selected = itemValue === value
    const label = reportSelectItemLabel(key, item => this._(item))
    return html`
      <md-select-option value="${itemValue}" ?selected=${selected}>
        <div slot="headline">${label}</div>
      </md-select-option>
    `
  }

  _handleSwitch(e) {
    this._options = {
      ...this._options,
      [e.target.id]: e.target.selected ? 'True' : 'False',
    }
    fireEvent(this, 'report-options:changed', this._options)
  }

  _handleSelect(e) {
    this._options = {
      ...this._options,
      [e.target.id]: e.target.value,
    }
    fireEvent(this, 'report-options:changed', this._options)
  }

  _handleText(e) {
    this._options = {
      ...this._options,
      [e.target.id]: e.target.value,
    }
    fireEvent(this, 'report-options:changed', this._options)
  }
}

window.customElements.define('grampsjs-report-options', GrampsjsReportOptions)
