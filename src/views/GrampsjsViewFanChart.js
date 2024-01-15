import {html, css} from 'lit'

import '@material/web/icon/icon'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/chips/input-chip'
import {mdiPalette} from '@mdi/js'

import {GrampsjsViewTreeChartBase} from './GrampsjsViewTreeChartBase.js'
import '../components/GrampsjsFanChart.js'

const colors = {
  nEvents: 'Number of events',
  nNotes: 'Number of notes',
  birthYear: 'Birth year',
  deathYear: 'Death year',
  age: 'Age',
  surname: 'Surname',
  religion: 'Religion',
  nPaths: 'Ancestor frequency',
}

export class GrampsjsViewFanChart extends GrampsjsViewTreeChartBase {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
          margin-bottom: -25px;
          --md-menu-item-one-line-container-height: 48px;
        }

        #controls md-input-chip {
          --md-sys-color-outline: rgba(0, 0, 0, 0.3);
          --md-sys-color-primary: rgba(0, 0, 0, 0.4);
          position: relative;
          top: 8px;
          margin-left: 10px;
          margin-bottom: 0px;
        }

        md-menu {
          min-width: 13em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      color: {type: String},
    }
  }

  constructor() {
    super()
    this.nAnc = 4
    this.nDesc = 1
    this._setDesc = false
    this.color = ''
  }

  _resetLevels() {
    this.nAnc = 4
  }

  renderChart() {
    return html`
      <grampsjs-fan-chart
        grampsId=${this.grampsId}
        depth=${this.nAnc + 1}
        .data=${this._data}
        .strings=${this.strings}
        color="${this.color}"
      >
      </grampsjs-fan-chart>
    `
  }

  renderControls() {
    return html`
      ${super.renderControls()}

      <mwc-icon-button
        icon="palette"
        @click=${this._handleColor}
        id="btn-color"
      ></mwc-icon-button>
      <grampsjs-tooltip for="btn-color" .strings="${this.strings}"
        >${this._('Color')}</grampsjs-tooltip
      >
      <span style="position: relative">
        <md-menu id="usage-menu" anchor="btn-color" skip-restore-focus>
          ${Object.keys(colors).map(
            color => html`
              <md-menu-item @click="${() => this._handleColorClick(color)}">
                <div slot="headline">${this._(colors[color])}</div>
              </md-menu-item>
            `
          )}
        </md-menu>
      </span>
      ${this.color && colors[this.color]
        ? html`
            <div style="display: inline-block; height: 50px;">
              <md-input-chip
                label="${this._(colors[this.color])}"
                @remove="${() => this._handleColorClick('')}"
              >
                <svg viewBox="0 0 24 24" slot="icon">
                  <path d="${mdiPalette}" />
                </svg>
              </md-input-chip>
            </div>
          `
        : ''}
    `
  }

  _handleColor() {
    const menu = this.renderRoot.querySelector('#usage-menu')
    menu.open = true
  }

  _handleColorClick(color) {
    this.color = color
  }
}

window.customElements.define('grampsjs-view-fan-chart', GrampsjsViewFanChart)
