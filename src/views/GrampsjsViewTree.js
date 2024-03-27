import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'

import {mdiFamilyTree} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import './GrampsjsViewDescendantChart.js'
import './GrampsjsViewTreeChart.js'
import './GrampsjsViewHourglassChart.js'
import './GrampsjsViewFanChart.js'
import './GrampsjsViewRelationshipChart.js'
import {fireEvent} from '../util.js'
import {
  chartFanIconPath,
  hourglassIconPath,
  renderIconSvg,
  relationshipGraphIconPath,
} from '../icons.js'

export class GrampsjsViewTree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
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

        md-primary-tab {
          opacity: 0.8;
        }

        md-primary-tab[active] {
          opacity: 1;
        }

        #tabs {
          height: 85px;
        }

        md-tabs {
          --md-divider-thickness: 0px;
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
      <div id="tabs">${this.renderTabs()}</div>
      ${this._currentTabId === 0 ? this._renderPedigree() : ''}
      ${this._currentTabId === 1 ? this._renderDescendantTree() : ''}
      ${this._currentTabId === 2 ? this._renderHourglassTree() : ''}
      ${this._currentTabId === 3 ? this._renderRelationshipChart() : ''}
      ${this._currentTabId === 4 ? this._renderFan() : ''}
    `
  }

  renderTabs() {
    return html`
      <md-tabs .activeTabIndex=${this._currentTabId}>
        <md-primary-tab
          @click=${() => {
            this._currentTabId = 0
          }}
          has-icon
          >${this._('Ancestor Tree')}
          <span slot="icon"
            >${renderIconSvg(
              mdiFamilyTree,
              '--md-sys-color-primary',
              -90
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab
          @click=${() => {
            this._currentTabId = 1
          }}
          has-icon
        >
          ${this._('Descendant Tree')}
          <span slot="icon"
            >${renderIconSvg(mdiFamilyTree, '--md-sys-color-primary', 90)}</span
          >
        </md-primary-tab>
        <md-primary-tab
          @click=${() => {
            this._currentTabId = 2
          }}
          has-icon
        >
          ${this._('Hourglass Graph')}
          <span slot="icon"
            >${renderIconSvg(hourglassIconPath, '--md-sys-color-primary')}</span
          >
        </md-primary-tab>
        <md-primary-tab
          @click=${() => {
            this._currentTabId = 3
          }}
          has-icon
        >
          ${this._('Relationship Chart')}
          <span slot="icon"
            >${renderIconSvg(
              relationshipGraphIconPath,
              '--md-sys-color-primary'
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab
          @click=${() => {
            this._currentTabId = 4
          }}
          has-icon
        >
          ${this._('Fan Chart')}
          <span slot="icon"
            >${renderIconSvg(chartFanIconPath, '--md-sys-color-primary')}</span
          >
        </md-primary-tab>
      </md-tabs>
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

  _renderRelationshipChart() {
    return html`
      <grampsjs-view-relationship-chart
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
      </grampsjs-view-relationship-chart>
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

  _renderDescendantTree() {
    return html`
      <grampsjs-view-descendant-chart
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
      </grampsjs-view-descendant-chart>
    `
  }

  _renderHourglassTree() {
    return html`
      <grampsjs-view-hourglass-chart
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
      </grampsjs-view-hourglass-chart>
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
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
