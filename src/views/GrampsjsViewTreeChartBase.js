import {css, html} from 'lit'

import '@material/mwc-textfield'

import {mdiAccountDetails, mdiHomeAccount} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTooltip.js'
import {apiGet} from '../api.js'
import {fireEvent} from '../util.js'
import {renderIcon} from '../icons.js'

export class GrampsjsViewTreeChartBase extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
          margin-bottom: -25px;
        }

        #controls {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          z-index: 1;
          padding: 0 10px;
        }

        #chart {
          height: calc(100vh - 165px);
          margin-left: -40px;
          margin-right: -40px;
          margin-bottom: -25px;
        }

        #controls mwc-icon-button {
          color: rgba(0, 0, 0, 0.35);
          --mdc-icon-size: 26px;
          --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.1);
        }

        #menu-controls mwc-textfield {
          width: 4em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      disableBack: {type: Boolean},
      disableHome: {type: Boolean},
      nAnc: {type: Number},
      nDesc: {type: Number},
      _data: {type: Array},
      _setAnc: {type: Boolean},
      _setDesc: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.nAnc = 3
    this.nDesc = 1
    this.disableBack = false
    this.disableHome = false
    this._data = []
    this._setAnc = false
    this._setDesc = false
    this._setSep = false
  }

  renderContent() {
    return html`<div style="position: relative;">
      <div id="controls">${this.renderControls()}</div>
      <div id="chart">${this.renderChart()}</div>
    </div>`
  }

  renderControls() {
    return html`
        <mwc-icon-button
          @click=${this._backToHomePerson}
          style="margin-bottom:-10px;"
          ?disabled=${this.disableHome}
          id="button-home"
          >${renderIcon(
            mdiHomeAccount,
            this.disableHome ? 'var(--mdc-theme-text-disabled-on-light)' : ''
          )}</mwc-icon-button>
          <grampsjs-tooltip
            for="button-home"
            .strings="${this.strings}"
            >${this._('Home Person')}</grampsjs-tooltip
          >

        <mwc-icon-button
          icon="arrow_back"
          @click=${this._handleBack}
          ?disabled=${this.disableBack}
          style="margin-bottom:-10px;"
          id="btn-back"
        ></mwc-icon-button>
        <grampsjs-tooltip
          for="btn-back"
          .strings="${this.strings}"
        >${this._('_Back')}</grampsjs-tooltip
        >
        <mwc-icon-button
          @click=${this._goToPerson}
          id="btn-person"
        >${renderIcon(mdiAccountDetails)}</mwc-icon-button>
        <grampsjs-tooltip
          for="btn-person"
          .strings="${this.strings}"
        >${this._('Person Details')}</grampsjs-tooltip
        >        <mwc-icon-button
          icon="settings"
          id="btn-controls"
          @click=${this._openMenuControls}
        ></mwc-icon-button>
        <grampsjs-tooltip
          for="btn-controls"
          .strings="${this.strings}"
        >${this._('Preferences')}</grampsjs-tooltip
      >
    <mwc-dialog id="menu-controls">
          <table>
          ${
            this._setAnc
              ? html` <tr>
                  <td>${this._('Max Ancestor Generations')}</td>
                  <td>
                    <mwc-textfield
                      value=${this.nAnc}
                      type="number"
                      min="1"
                      @change=${this._handleChangeAnc}
                    ></mwc-textfield>
                  </td>
                </tr>`
              : ''
          }${
      this._setDesc
        ? html`
            <tr>
              <td>${this._('Max Descendant Generations')}</td>
              <td>
                <mwc-textfield
                  value=${this.nDesc}
                  type="number"
                  min="0"
                  @change=${this._handleChangeDesc}
                ></mwc-textfield>
              </td>
            </tr>
          `
        : ''
    }${
      this._setSep
        ? html`
            <tr>
              <td>${this._('Max Degree of Separation')}</td>
              <td>
                <mwc-textfield
                  value=${this.nAnc}
                  type="number"
                  min="0"
                  @change=${this._handleChangeAnc}
                ></mwc-textfield>
              </td>
            </tr>
          `
        : ''
    }
          </table>
          <mwc-button slot="primaryAction" dialogAction="close"
            >${this._('done')}</mwc-button
          >
          <mwc-button slot="secondaryAction" @click="${this._resetLevels}"
            >${this._('Reset')}</mwc-button
          >
        </mwc-dialog>
      </div>

    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderChart() {
    return ''
  }

  _backToHomePerson() {
    fireEvent(this, 'tree:home')
  }

  _prevPerson() {
    fireEvent(this, 'tree:back')
  }

  update(changed) {
    super.update(changed)
    if (
      changed.has('grampsId') ||
      changed.has('nAnc') ||
      changed.has('nDesc')
    ) {
      this._fetchData(this.grampsId)
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _resetLevels() {}

  _getPersonRules(grampsId) {
    return {
      function: 'or',
      rules: [
        {
          name: 'IsLessThanNthGenerationAncestorOf',
          values: [grampsId, this.nAnc + 1],
        },
        {
          name: 'IsLessThanNthGenerationDescendantOf',
          values: [grampsId, this.nDesc + 1],
        },
      ],
    }
  }

  async _fetchData(grampsId) {
    this.loading = true
    const rules = this._getPersonRules(grampsId)
    const data = await apiGet(
      `/api/people/?rules=${encodeURIComponent(JSON.stringify(rules))}&locale=${
        this.strings?.__lang__ || 'en'
      }&profile=self&extend=event_ref_list,primary_parent_family,family_list`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _goToPerson() {
    fireEvent(this, 'tree:person')
  }

  _handleBack() {
    fireEvent(this, 'tree:back')
  }

  _handleChangeAnc(e) {
    this.nAnc = parseInt(e.target.value, 10)
  }

  _handleChangeDesc(e) {
    this.nDesc = parseInt(e.target.value, 10)
  }

  _openMenuControls() {
    const menu = this.shadowRoot.getElementById('menu-controls')
    menu.open = true
  }
}
