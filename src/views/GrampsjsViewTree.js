import {css, html} from 'lit'
import {ifDefined} from 'lit/directives/if-defined.js'
import {keyed} from 'lit/directives/keyed.js'
import {map} from 'lit/directives/map.js'

import '@material/mwc-textfield'
import '@material/web/button/filled-button'
import '@material/web/button/outlined-button'
import '@material/web/button/text-button.js'
import '@material/web/dialog/dialog.js'
import '@material/web/fab/fab.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import {
  mdiArrowLeft,
  mdiChevronRight,
  mdiCog,
  mdiFamilyTree,
  mdiFitToScreen,
  mdiHomeAccount,
  mdiPencil,
  mdiPlus,
  mdiTargetAccount,
} from '@mdi/js'
import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPillToggle.js'
import '../components/GrampsjsTooltip.js'
import '../components/GrampsjsTreeChartAddPerson.js'
import {
  chartDataUrl,
  chartDefinitions,
  chartSettingValues,
} from './treeChartDefinitions.js'
import {chartNameDisplayFormat, fireEvent, isKeyEventInInput} from '../util.js'
import {chartTransitionDuration} from '../charts/util.js'
import {renderPersonAvatar} from '../components/personListUtils.js'
import {iconButtonColorStyles, listAvatarStyles} from '../SharedStyles.js'
import {
  chartFanIconPath,
  hourglassIconPath,
  relationshipGraphIconPath,
} from '../icons.js'
import {
  DEFAULT_TREE_VIEW,
  TREE_VIEWS,
  getTreeViewTabIndex,
} from '../treeDefaults.js'

// Zoom factor of one zoom step, distance of one pan step in pixels, and the
// duration of a zoom or pan in milliseconds
const zoomStep = 1.25
const panStep = 100
const viewportDuration = 300

// Changes of the chart viewport, by name
const viewportActions = {
  zoomIn: (viewport, duration) => viewport.zoomBy(zoomStep, {duration}),
  zoomOut: (viewport, duration) => viewport.zoomBy(1 / zoomStep, {duration}),
  panLeft: (viewport, duration) => viewport.panBy(panStep, 0, {duration}),
  panRight: (viewport, duration) => viewport.panBy(-panStep, 0, {duration}),
  panUp: (viewport, duration) => viewport.panBy(0, panStep, {duration}),
  panDown: (viewport, duration) => viewport.panBy(0, -panStep, {duration}),
  fit: (viewport, duration) => viewport.fit({duration}),
  centre: (viewport, duration) => viewport.centreRoot({duration}),
}

// Viewport actions by key
const viewportKeys = {
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  ArrowLeft: 'panLeft',
  ArrowRight: 'panRight',
  ArrowUp: 'panUp',
  ArrowDown: 'panDown',
  0: 'fit',
}

// Elements that handle keys themselves, such as arrow keys in tabs and menus
const keyHandlingElements = [
  'grampsjs-pill-toggle',
  'md-menu',
  'mwc-menu',
  'md-dialog',
]

// Shows the charts of the selected person in tabs. Each chart is described by
// its definition in `chartDefinitions`, which gives its settings, the people
// it needs and edit mode. People are fetched again only when the request
// changes, and a response that arrives after a newer request was sent is
// ignored.
export class GrampsjsViewTree extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      iconButtonColorStyles,
      listAvatarStyles,
      css`
        .with-margin {
          margin: 25px 40px;
        }

        /* The chart switcher, 40px high like Material 3 segmented buttons,
           and a gap of 12px, like the rows below */
        #tabs {
          height: 52px;
          --grampsjs-pill-toggle-margin: 0;
          --grampsjs-pill-toggle-padding: 9px 16px;
        }

        #controls {
          position: absolute;
          background-color: var(--md-sys-color-surface-container-low);
          border-radius: 16px;
          z-index: 1;
          /* The first icon is centred below the first icon of the switcher */
          padding: 0 10px 0 5px;
          display: flex;
          align-items: center;
          --grampsjs-icon-button-color: var(--grampsjs-body-font-color-35);
          --grampsjs-icon-button-disabled-color: var(
            --grampsjs-body-font-color-10
          );
          --grampsjs-icon-button-disabled-opacity: 1;
        }

        #chart {
          height: calc(100vh - 145px);
          margin-left: -40px;
          margin-right: -40px;
          margin-bottom: -25px;
        }

        @media (max-width: 768px) {
          #chart {
            margin-left: -20px;
            margin-right: -20px;
          }
        }

        @media (max-width: 599px) {
          #chart {
            height: calc(100vh - 137px);
          }
        }

        #controls md-icon-button {
          --md-icon-button-icon-size: 26px;
        }

        /* Below the controls bar, in the same colours, with the avatar centred
           below the first button of the bar */
        #selected-person {
          position: absolute;
          top: 60px;
          left: 0;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          max-width: min(360px, 80vw);
          height: 48px;
          padding: 0 8px 0 9px;
          border: none;
          border-radius: 24px;
          background-color: var(--md-sys-color-surface-container-low);
          color: var(--grampsjs-body-font-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        #selected-person:hover {
          background-color: var(--md-sys-color-surface-container);
        }

        #selected-person:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: 2px;
        }

        #selected-person .avatar {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
        }

        #selected-person .text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.3;
        }

        #selected-person .name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
        }

        #selected-person .gramps-id {
          font-size: 12px;
          color: var(--grampsjs-body-font-color-50);
        }

        #selected-person .chevron {
          flex: none;
          color: var(--grampsjs-body-font-color-50);
        }

        #controls .divider {
          display: inline-block;
          width: 1px;
          height: 24px;
          margin: 0 8px;
          background-color: var(--grampsjs-body-font-color-10);
        }

        #controls md-input-chip {
          --md-sys-color-outline: var(--grampsjs-body-font-color-30);
          --md-sys-color-primary: var(--grampsjs-body-font-color-40);
          max-width: 240px;
          margin: 0 4px;
        }

        @media (max-width: 599px) {
          #controls md-input-chip {
            max-width: 140px;
          }
        }

        #usage-menu {
          min-width: 13em;
          --md-menu-item-one-line-container-height: 48px;
        }

        #menu-controls mwc-textfield {
          width: 6em;
        }

        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      _history: {type: Array},
      _currentTabId: {type: Number},
      _data: {type: Array},
      _editMode: {type: Boolean},
      _chartState: {type: Object},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this._history = this.grampsId ? [this.grampsId] : []
    this._currentTabId = getTreeViewTabIndex(DEFAULT_TREE_VIEW)
    this._appliedTreeDefaultView = null
    this._data = []
    this._dataChart = undefined
    this._dataUrl = ''
    this._dataRequest = 0
    this._selectedPerson = undefined
    this._editMode = false
    this._chartState = {}
    this._boundSelectPerson = this._selectPerson.bind(this)
    this._boundToggleEditMode = this._toggleEditMode.bind(this)
    this._boundDisableEditMode = this._disableEditMode.bind(this)
    this._boundHandleChartKey = this._handleChartKey.bind(this)
  }

  get chart() {
    return TREE_VIEWS[this._currentTabId]
  }

  get definition() {
    return chartDefinitions[this.chart] ?? chartDefinitions.ancestor
  }

  get settingValues() {
    return chartSettingValues(this.definition, this.appState?.settings)
  }

  get chartState() {
    return this._chartState
  }

  setChartState(changes) {
    this._chartState = {...this._chartState, ...changes}
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('pedigree:person-selected', this._boundSelectPerson)
    window.addEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
    window.addEventListener('keydown', this._boundHandleChartKey)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'pedigree:person-selected',
      this._boundSelectPerson
    )
    window.removeEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
    window.removeEventListener('keydown', this._boundHandleChartKey)
  }

  willUpdate(changed) {
    super.willUpdate(changed)
    // The history gets each newly selected person, also one selected while
    // the view was not active
    if (this.grampsId && this.grampsId !== this._history.at(-1)) {
      // limit history to 100 people
      this._history = [...this._history, this.grampsId].slice(-100)
    }
    // The selected person shown below the chart, who stays until the people
    // of a newly selected person arrive
    const selected = this._data.find(p => p.gramps_id === this.grampsId)
    if (selected) {
      this._selectedPerson = selected
    }
    // People fetched for another chart are not passed to a new chart
    if (this.chart !== this._dataChart) {
      this._dataChart = this.chart
      this._data = []
      this._dataUrl = ''
      this._chartState = {}
    }
  }

  update(changed) {
    super.update(changed)
    if (this.active && (changed.has('active') || changed.has('settings'))) {
      this._applyPreferredTabIfNeeded()
    }
    // A chart that changed during this update fetches in the next one
    if (this.chart === this._dataChart) {
      this._fetchIfNeeded()
    }
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('_currentTabId')) {
      fireEvent(this, 'edit-mode:off', {})
    }
  }

  handleUpdateStaleData() {
    if (this._dataUrl) {
      this._fetchData(this._dataUrl)
    }
  }

  // Fetches the people the chart needs when the request differs from the last
  // one, which happens when the selected person, the chart, the language or a
  // setting of the request changes
  _fetchIfNeeded() {
    if (!this.grampsId) {
      return
    }
    const url = chartDataUrl(
      this.definition,
      this.grampsId,
      this.settingValues,
      this.appState?.i18n?.lang
    )
    if (url !== this._dataUrl) {
      this._dataUrl = url
      this._fetchData(url)
    }
  }

  async _fetchData(url) {
    this._dataRequest += 1
    const request = this._dataRequest
    this.loading = true
    const data = await this.appState.apiGet(url)
    if (request !== this._dataRequest) {
      return
    }
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  renderContent() {
    if (this.grampsId === '') {
      return this._renderNoHomePerson()
    }
    const {editable} = this.definition
    return html`
      <div id="tabs">${this.renderTabs()}</div>
      <div style="position: relative;">
        <div id="controls">${this.renderControls()}</div>
        <div id="chart">${this.renderChart()}</div>
        ${this.renderSelectedPerson()}
      </div>
      ${editable && this.appState.permissions.canEdit && !this._editMode
        ? this.renderFab()
        : ''}
      ${editable
        ? html`<grampsjs-tree-chart-add-person
            .appState="${this.appState}"
          ></grampsjs-tree-chart-add-person>`
        : ''}
    `
  }

  _handleTabChange(e) {
    this._currentTabId = getTreeViewTabIndex(e.detail.value)
  }

  // A segmented control to switch between the charts
  renderTabs() {
    const options = [
      {
        value: 'ancestor',
        label: this._('Ancestor Tree'),
        icon: mdiFamilyTree,
        rotate: -90,
      },
      {
        value: 'descendant',
        label: this._('Descendant Tree'),
        icon: mdiFamilyTree,
        rotate: 90,
      },
      {
        value: 'hourglass',
        label: this._('Hourglass Graph'),
        icon: hourglassIconPath,
      },
      {
        value: 'relationship',
        label: this._('Relationship Graph'),
        icon: relationshipGraphIconPath,
      },
      {value: 'fan', label: this._('Fan Chart'), icon: chartFanIconPath},
    ]
    return html`
      <grampsjs-pill-toggle
        muted
        icons-only-narrow
        .ariaLabel="${this._('Family Tree')}"
        .options=${options}
        .selected=${this.chart}
        .appState=${this.appState}
        @pill-toggle:change=${this._handleTabChange}
      ></grampsjs-pill-toggle>
    `
  }

  renderChart() {
    const {definition} = this
    const chart = keyed(
      this.chart,
      definition.render({
        grampsId: this.grampsId,
        values: this.settingValues,
        data: this._data,
        canEdit: this._editMode,
        appState: this.appState,
        state: this._chartState,
      })
    )
    if (!definition.editable) {
      return chart
    }
    return html`
      <div @add-new-person-relation="${this._handleAddPersonRelation}">
        ${chart}
      </div>
    `
  }

  renderFab() {
    return html`
      <md-fab variant="secondary" @click="${this._enableEditMode}">
        <grampsjs-icon
          slot="icon"
          .path="${mdiPencil}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  renderControls() {
    return html`
      <md-icon-button
        @click=${this._backToHomePerson}
        ?disabled=${this.grampsId === this.settings.homePerson}
        aria-label="${this._('Home Person')}"
        id="button-home"
        ><grampsjs-icon
          path="${mdiHomeAccount}"
          color="currentColor"
        ></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="button-home" .appState="${this.appState}"
        >${this._('Home Person')}</grampsjs-tooltip
      >
      <md-icon-button
        @click=${this._prevPerson}
        ?disabled=${this._history.length < 2}
        aria-label="${this._('_Back')}"
        id="btn-back"
        ><grampsjs-icon
          path="${mdiArrowLeft}"
          color="currentColor"
        ></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="btn-back" .appState="${this.appState}"
        >${this._('_Back')}</grampsjs-tooltip
      >
      <span class="divider"></span>
      ${this.definition.zoomable ? this.renderViewportControls() : ''}
      ${this.definition.renderControls?.(this) ?? ''}
      <span class="divider"></span>
      <md-icon-button
        id="btn-controls"
        aria-label="${this._('Preferences')}"
        @click=${this._openMenuControls}
        ><grampsjs-icon path="${mdiCog}" color="currentColor"></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for="btn-controls" .appState="${this.appState}"
        >${this._('Preferences')}</grampsjs-tooltip
      >
      <md-dialog id="menu-controls">
        <div slot="content">
          <table>
            ${this.definition.settings.map(
              setting => html`
                <tr>
                  <td>${this._(setting.label)}</td>
                  <td>${this._renderSettingInput(setting)}</td>
                </tr>
              `
            )}
          </table>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._resetSettings}"
            >${this._('Reset')}</md-text-button
          >
          <md-text-button @click="${this._closeMenuControls}"
            >${this._('Close')}</md-text-button
          >
        </div>
      </md-dialog>
    `
  }

  // The selected person, with the avatar of person lists, their name in the
  // chart's name display format and their Gramps ID, as a button that opens
  // their page
  renderSelectedPerson() {
    const profile = this._selectedPerson?.profile
    if (!profile) {
      return ''
    }
    const given = profile.name_given || '…'
    const surname = profile.name_surname || '…'
    const name =
      this.settingValues.nameDisplayFormat ===
      chartNameDisplayFormat.givenThenSurname
        ? `${given} ${surname}`
        : `${surname}, ${given}`
    return html`
      <button
        id="selected-person"
        aria-label="${this._('Person Details')}: ${name}"
        @click=${this._goToPerson}
      >
        <span class="avatar"
          >${renderPersonAvatar(this._selectedPerson, profile.sex)}</span
        >
        <span class="text">
          <span class="name">${name}</span>
          <span class="gramps-id">${this._selectedPerson.gramps_id}</span>
        </span>
        <grampsjs-icon
          class="chevron"
          path="${mdiChevronRight}"
          color="currentColor"
          height="20"
          width="20"
        ></grampsjs-icon>
      </button>
      <grampsjs-tooltip for="selected-person" .appState="${this.appState}"
        >${this._('Person Details')}</grampsjs-tooltip
      >
    `
  }

  // Buttons for the chart viewport. Zooming uses the mouse wheel, pinching or
  // keys.
  renderViewportControls() {
    const button = (id, action, path, label) => html`
      <md-icon-button
        id=${id}
        aria-label="${this._(label)}"
        @click=${() => this._runViewportAction(action)}
        ><grampsjs-icon path="${path}" color="currentColor"></grampsjs-icon
      ></md-icon-button>
      <grampsjs-tooltip for=${id} .appState="${this.appState}"
        >${this._(label)}</grampsjs-tooltip
      >
    `
    return html`
      ${button(
        'btn-centre',
        'centre',
        mdiTargetAccount,
        'Center on selected person'
      )}
      ${button('btn-fit', 'fit', mdiFitToScreen, 'Fit to window')}
    `
  }

  // The viewport of the chart, if it has viewport controls
  _chartViewport() {
    if (!this.definition.zoomable) {
      return undefined
    }
    return this.renderRoot?.querySelector(
      '#chart grampsjs-tree-chart, #chart grampsjs-relationship-chart'
    )?.viewport
  }

  _runViewportAction(action) {
    const viewport = this._chartViewport()
    if (viewport) {
      viewportActions[action](
        viewport,
        chartTransitionDuration(viewportDuration)
      )
    }
  }

  // Zooms and moves the chart with the keys in `viewportKeys`. Keys with a
  // modifier, keys typed into a field and keys for elements that handle them
  // themselves are left alone.
  _handleChartKey(e) {
    const action = viewportKeys[e.key]
    if (
      !action ||
      !this.active ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      isKeyEventInInput(e) ||
      e
        .composedPath()
        .some(el => keyHandlingElements.includes(el.tagName?.toLowerCase()))
    ) {
      return
    }
    if (!this._chartViewport()) {
      return
    }
    e.preventDefault()
    this._runViewportAction(action)
  }

  _renderSettingInput(setting) {
    const value = this.settingValues[setting.name]
    if (setting.type === 'nameDisplayFormat') {
      return html`
        <md-filled-select
          id="name-display-format"
          @change=${e => this._changeSetting(setting, e.target.value)}
        >
          ${map(
            Object.values(chartNameDisplayFormat),
            format => html`<md-select-option
              value="${format}"
              ?selected="${format === value}"
            >
              <div slot="headline">${this._(format)}</div>
            </md-select-option>`
          )}
        </md-filled-select>
      `
    }
    return html`
      <mwc-textfield
        value=${value}
        type="number"
        min=${setting.min}
        size=${ifDefined(setting.size)}
        @change=${e =>
          this._changeSetting(setting, parseInt(e.target.value, 10))}
      ></mwc-textfield>
    `
  }

  _changeSetting(setting, value) {
    this.appState.updateSettings({[setting.key]: value}, false)
  }

  _resetSettings() {
    this.appState.updateSettings(
      Object.fromEntries(
        this.definition.settings.map(setting => [setting.key, setting.default])
      ),
      false
    )
  }

  _openMenuControls() {
    this.renderRoot.getElementById('menu-controls').show()
  }

  _closeMenuControls() {
    this.renderRoot.getElementById('menu-controls').close()
  }

  _enableEditMode() {
    if (!this.definition.editable) {
      return
    }
    this._editMode = true
    fireEvent(this, 'edit-mode:on', {
      title: this._('Edit'),
      hideDeleteButton: true,
    })
  }

  _disableEditMode() {
    this._editMode = false
  }

  _toggleEditMode() {
    if (
      !this.active ||
      !this.definition.editable ||
      !this.appState.permissions.canEdit
    ) {
      return
    }
    if (this._editMode) {
      this._disableEditMode()
      fireEvent(this, 'edit-mode:off', {})
    } else {
      this._enableEditMode()
    }
  }

  _handleAddPersonRelation(e) {
    const personData = this._data.find(p => p.handle === e.detail.handle)
    if (!personData) {
      return
    }
    this.renderRoot
      .querySelector('grampsjs-tree-chart-add-person')
      ?.open(personData)
  }

  // Shown whenever no home person is set. An empty tree has nobody to pick, so
  // it offers person creation. The first person becomes the home person, which
  // brings the user straight back here with a chart to look at.
  _renderNoHomePerson() {
    // A missing object_counts counts as empty: person creation leads somewhere
    // either way, while the picker has nothing to offer an empty tree.
    const hasPeople = this.appState.dbInfo?.object_counts?.people
    // The Home link is the escape hatch for users whose permissions leave them
    // no action below.
    return html`
      <div class="with-margin">
        <p>
          ${this._('No Home Person set.')}
          <a href="/">${this._('Home')}</a>
        </p>
        ${hasPeople
          ? this._renderHomePersonPicker()
          : this._renderAddFirstPerson()}
      </div>
    `
  }

  _renderAddFirstPerson() {
    if (!this.appState.permissions?.canAdd) {
      return ''
    }
    return html`
      <md-filled-button href="/new_person">
        <grampsjs-icon
          slot="icon"
          path="${mdiPlus}"
          color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
        ></grampsjs-icon>
        ${this._('New Person')}
      </md-filled-button>
    `
  }

  _renderHomePersonPicker() {
    return html`
      <md-outlined-button id="select-home-person" @click="${this._openPicker}">
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

  // Opens the page of the person shown below the controls bar, who is the
  // previous person while a newly selected person is loading
  _goToPerson() {
    const grampsId = this._selectedPerson?.gramps_id ?? this.grampsId
    fireEvent(this, 'nav', {path: `person/${grampsId}`})
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
