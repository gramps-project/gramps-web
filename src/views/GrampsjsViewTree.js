import {css, html} from 'lit'

import '@material/mwc-icon-button'
import '@material/mwc-icon'
import '@material/mwc-tab-bar'
import '@material/mwc-tab'

import {mdiFamilyTree} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import './GrampsjsViewTreeChart.js'
import './GrampsjsViewFanChart.js'
import {fireEvent} from '../util.js'
import {chartFanIconPath, renderIconSvg} from '../icons.js'

export class GrampsjsViewTree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        mwc-tab-bar {
          margin-bottom: 20px;
        }

        .with-margin {
          margin: 25px 40px;
        }

        #outer-container {
          height: calc(100vh - 68px);
        }

        #select {
          z-index: 1;
          position: absolute;
          top: 85px;
          right: 25px;
          border-radius: 5px;
          background-color: rgba(255, 255, 255, 0.9);
          color: #b1b1b1;
          --mdc-theme-text-disabled-on-light: #666;
          --mdc-icon-size: 32px;
        }

        mwc-tab {
          opacity: 0.8;
        }

        mwc-tab[active] {
          opacity: 1;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      view: {type: String},
      _history: {type: Array},
      _currentTabId: {type: Number},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.view = 'ancestor'
    this._history = this.grampsId ? [this.grampsId] : []
    this._currentTabId = 0
  }

  renderContent() {
    if (this.grampsId === '') {
      return html`
        <div class="with-margin">
          <p>
            ${this._('No Home Person set.')}
            <a href="/settings">${this._('User settings')}</a>
          </p>
        </div>
      `
    }
    return html`
      ${this.renderTabs()}
      ${this._currentTabId === 0 ? this._renderPedigree() : ''}
      ${this._currentTabId === 1 ? this._renderFan() : ''}
    `
  }

  renderTabs() {
    return html`
      <mwc-tab-bar
        .activeIndex=${this._currentTabId}
        @MDCTabBar:activated=${this._handleTabActivated}
        @MDCTab:interacted=${this._handleTabInteracted}
      >
        <mwc-tab
          @click=${() => {
            this._currentTabId = 0
          }}
          hasImageIcon
          label="${this._('Ancestor Tree')}"
          ><span slot="icon"
            >${renderIconSvg(mdiFamilyTree, 'var(--mdc-theme-primary)')}</span
          >
        </mwc-tab>
        <mwc-tab
          @click=${() => {
            this._currentTabId = 1
          }}
          hasImageIcon
          label="${this._('Fan Chart')}"
          ><span slot="icon"
            >${renderIconSvg(
              chartFanIconPath,
              'var(--mdc-theme-primary)'
            )}</span
          >
        </mwc-tab>
      </mwc-tab-bar>
    `
  }

  _renderFan() {
    return html`
      <grampsjs-view-fan-chart
        @tree:back="${this._prevPerson}"
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .strings=${this.strings}
        .settings=${this.settings}
        ?disableBack=${this._history.length < 2}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-fan-chart>
    `
  }

  _renderPedigree() {
    return html`
      <grampsjs-view-tree-chart
        @tree:back="${this._prevPerson}"
        @tree:person="${this._goToPerson}"
        @tree:home="${this._backToHomePerson}"
        grampsId=${this.grampsId}
        ?active=${this.active}
        .strings=${this.strings}
        .settings=${this.settings}
        ?disableBack=${this._history.length < 2}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-tree-chart>
    `
  }

  _prevPerson() {
    this._history.pop()
    this.grampsId = this._history.pop()
  }

  _backToHomePerson() {
    this.grampsId = this.settings.homePerson
  }

  _goToPerson() {
    fireEvent(this, 'nav', {path: `person/${this.grampsId}`})
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener(
      'pedigree:person-selected',
      this._selectPerson.bind(this)
    )
  }

  update(changed) {
    super.update(changed)
    if (changed.has('grampsId')) {
      this._history.push(this.grampsId)
      // limit history to 100 people
      this._history = this._history.slice(-100)
    }
  }

  async _selectPerson(event) {
    const {grampsId} = event.detail
    this.grampsId = grampsId
  }

  _handleTabActivated(event) {
    this._currentTabId = event.detail.index
  }

  _handleTabInteracted(event) {
    this._currentTab = event.detail.tabId
  }
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
