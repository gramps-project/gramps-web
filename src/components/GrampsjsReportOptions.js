import {LitElement, css, html} from 'lit'
import '@material/mwc-select'
import '@material/mwc-textfield'
import '@material/mwc-list/mwc-list-item'
import '@material/web/switch/switch'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

const _forbiddenOptions = ['css', 'of', 'style']

export class GrampsjsReportOptions extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .option {
          margin-bottom: 1em;
        }

        .label {
          margin-right: 1em;
          width: 20em;
          display: inline-block;
          font-size: 16px;
          line-height: 24px;
          vertical-align: middle;
          margin-bottom: 0.5em;
        }

        .form {
          vertical-align: middle;
        }

        mwc-textfield,
        mwc-select {
          min-width: 20em;
          max-width: 100%;
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

  render() {
    return html`
      ${Object.keys(this.optionsDict)
        .filter(key => !_forbiddenOptions.includes(key))
        .map(key => this._renderOption(key))}
    `
  }

  _renderOption(key) {
    const options = this.optionsHelp[key][2]
    if (options.constructor.name === 'Array') {
      if (
        options.length === 2 &&
        options.sort()[0] === 'False' &&
        options.sort()[1] === 'True'
      ) {
        return this._renderBooleanOption(key)
      }
      return this._renderArrayOption(key)
    }
    return this._renderStringOption(key)
  }

  _renderBooleanOption(key) {
    return html`
      <div class="option">
        <span class="label">${this._(this.optionsHelp[key][1]) || key}</span>
        <span class="form">
          <md-switch
            id="${key}"
            ?selected="${this.optionsDict[key] === 'true'}"
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
        <span class="label">${this._(this.optionsHelp[key][1]) || key}</span>
        <span class="form">
          <mwc-select id="${key}" @change="${this._handleSelect}">
            ${this.optionsHelp[key][2].map(item =>
              this._renderSelectItem(item, this.optionsDict[key])
            )}
          </mwc-select>
        </span>
      </div>
    `
  }

  _renderStringOption(key) {
    const label = this._(this.optionsHelp[key][1]) || key
    const helper = this.optionsHelp[key][2]
    return html`
      <div class="option">
        <span class="label">${label}</span>
        <span class="form">
          <mwc-textfield
            @input="${this._handleText}"
            id="${key}"
            helper="${this._(helper)}"
            helperPersistent
            type="${helper.includes('A number') ? 'number' : 'text'}"
          ></mwc-textfield>
        </span>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSelectItem(key, value) {
    const splt = key.split(/\t+/)
    const selected = splt[0] === `${value}` || splt[0] === 'pdf'
    return html`
      <mwc-list-item value="${splt[0]}" ?selected=${selected}
        >${this._(splt.length === 1 ? splt[0] : splt[1])}</mwc-list-item
      >
    `
  }

  _handleSwitch(e) {
    console.log('Switch', e.target.id, e.target.selected)
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
