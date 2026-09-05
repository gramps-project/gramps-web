import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'

import {mdiFamilyTree, mdiPlus, mdiPencil} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsFormSelectObject.js'
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
import {DEFAULT_TREE_VIEW, getTreeViewTabIndex} from '../treeDefaults.js'

export class GrampsjsViewTree extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .with-margin {
          margin: 25px 40px;
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
    this._currentTabId = getTreeViewTabIndex(DEFAULT_TREE_VIEW)
    this._appliedTreeDefaultView = null
  }

  shouldUpdate(changed) {
    // Allow one render when active changes so child chart views receive
    // the updated active value — the base class blocks renders when inactive.
    if (changed.has('active')) {
      return true
    }
    return super.shouldUpdate(changed)
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('_currentTabId')) {
      fireEvent(this, 'edit-mode:off', {})
    }
  }

  renderContent() {
    if (this.grampsId === '') {
      return this._renderNoHomePerson()
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

  _handleTabChange(e) {
    this._currentTabId = e.target.activeTabIndex
  }

  renderTabs() {
    return html`
      <md-tabs
        .activeTabIndex=${this._currentTabId}
        @change=${this._handleTabChange}
      >
        <md-primary-tab has-icon
          >${this._('Ancestor Tree')}
          <span slot="icon"
            >${renderIconSvg(
              mdiFamilyTree,
              '--md-sys-color-primary',
              -90
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Descendant Tree')}
          <span slot="icon"
            >${renderIconSvg(mdiFamilyTree, '--md-sys-color-primary', 90)}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Hourglass Graph')}
          <span slot="icon"
            >${renderIconSvg(hourglassIconPath, '--md-sys-color-primary')}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
          ${this._('Relationship Graph')}
          <span slot="icon"
            >${renderIconSvg(
              relationshipGraphIconPath,
              '--md-sys-color-primary'
            )}</span
          >
        </md-primary-tab>
        <md-primary-tab has-icon>
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
        .appState="${this.appState}"
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
        .appState="${this.appState}"
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
        .appState="${this.appState}"
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
        .appState="${this.appState}"
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
        .appState="${this.appState}"
        .settings=${this.settings}
        ?disableBack=${this._history.length < 2}
        ?disableHome=${this.grampsId === this.settings.homePerson}
      >
      </grampsjs-view-hourglass-chart>
    `
  }

  // Shown whenever no home person is set. An empty tree has nobody to pick, so
  // it offers person creation. The first person becomes the home person, which
  // brings the user straight back here with a chart to look at.
  _renderNoHomePerson() {
    // Truthiness rather than an explicit zero: a missing object_counts falls
    // through to person creation, which is a way forward whether or not the
    // tree turns out to be empty. The picker would be a dead end.
    const hasPeople = this.appState.dbInfo?.object_counts?.people
    if (!hasPeople) {
      return html`
        <div class="with-margin">
          <p>${this._('No Home Person set.')}</p>
          ${this.appState.permissions?.canAdd
            ? html`
                <md-filled-button href="/new_person">
                  <grampsjs-icon
                    slot="icon"
                    path="${mdiPlus}"
                    color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
                  ></grampsjs-icon>
                  ${this._('New Person')}
                </md-filled-button>
              `
            : ''}
        </div>
      `
    }
    return html`
      <div class="with-margin">
        <p>${this._('No Home Person set.')}</p>
        <md-outlined-button
          id="select-home-person"
          @click="${this._openPicker}"
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiPencil}"
            color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
          ></grampsjs-icon>
          ${this._('Set _Home Person')}
        </md-outlined-button>
        <grampsjs-form-select-object
          @select-object:changed="${this._handleHomePerson}"
          objectType="person"
          .appState="${this.appState}"
          id="homeperson-select"
          label="${this._('Select')}"
          fixedMenuPosition
          hideButton
        ></grampsjs-form-select-object>
      </div>
    `
  }

  _openPicker() {
    this.renderRoot.querySelector('#homeperson-select')?.open()
  }

  _handleHomePerson(e) {
    const grampsId = e.detail.objects[0]?.object?.gramps_id
    if (grampsId) {
      this.appState.updateSettings({homePerson: grampsId}, true)
    }
    e.preventDefault()
    e.stopPropagation()
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
    if (this.active && (changed.has('active') || changed.has('settings'))) {
      this._applyPreferredTabIfNeeded()
    }
  }

  _applyPreferredTabIfNeeded() {
    const preferredView = this.settings?.treeDefaultView ?? DEFAULT_TREE_VIEW
    if (preferredView === this._appliedTreeDefaultView) {
      return
    }
    const preferredIndex = getTreeViewTabIndex(preferredView)
    this._appliedTreeDefaultView = preferredView
    if (this._currentTabId !== preferredIndex) {
      this._currentTabId = preferredIndex
    }
  }

  async _selectPerson(event) {
    const {grampsId} = event.detail
    this.grampsId = grampsId
  }
}

window.customElements.define('grampsjs-view-tree', GrampsjsViewTree)
