/* eslint-disable class-methods-use-this */

import {css, html} from 'lit'

import '@material/web/select/filled-select'
import '@material/mwc-fab'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewDnaBase extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        mwc-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }

        md-tabs {
          margin-bottom: 40px;
          width: max-content;
          max-width: 100%;
        }

        md-primary-tab {
          flex: 0 0 auto;
          width: auto;
        }

        md-filled-select {
          --md-filled-select-text-field-input-text-font-size: 24px;
          margin-bottom: 30px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      dialogContent: {type: String},
      grampsId: {type: String},
      homePersonGrampsId: {type: String},
      edit: {type: Boolean},
      _data: {type: Array},
      _matchData: {type: Array},
      _matchDataLoading: {type: Boolean},
      _selectDataLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.dialogContent = ''
    this.grampsId = ''
    this.homePersonGrampsId = ''
    this.edit = false
    this._data = []
    this._matchData = []
    this._matchDataLoading = false
    this._selectDataLoading = false
  }

  render() {
    return html`
      ${this._renderSelect()}
      ${!this._selectDataLoading && !this._data.length
        ? this._renderNoData()
        : this.renderContent()}
      ${this.appState.permissions.canEdit ? this.renderFab() : ''}
      ${this.dialogContent}
    `
  }

  _goTo(path) {
    // we don't want this to be triggered when we navigated off the page
    if (this.active) {
      fireEvent(this, 'nav', {path})
    }
  }

  renderFab() {
    return this.grampsIdMatch
      ? html`<mwc-fab icon="edit" @click=${this._handleClickEdit}></mwc-fab>`
      : html`<mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab>`
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleSelectChange() {
    const grampsId = this.renderRoot.querySelector('md-filled-select').value
    this._goTo(`${this.page}/${grampsId}`)
  }

  async _fetchSelectData() {
    this.loading = true
    this._selectDataLoading = true
    const uri = this._selectUrl
    const data = await this.appState.apiGet(uri)
    this.loading = false
    this._selectDataLoading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      await this._fetchMatchDataIfNeeded()
      this._setGrampsIdIfNeeded()
    }
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  get selectedHandle() {
    return this._data.find(person => person.gramps_id === this.grampsId)?.handle
  }

  async _fetchMatchDataIfNeeded() {
    if (this._shouldLoadMatchData()) {
      await this._fetchMatchData()
    }
  }

  async _fetchMatchData() {
    this.loading = true
    this._matchDataLoading = true
    if (!this.selectedHandle) {
      this.loading = false
      this._matchDataLoading = false
      return
    }
    const uri = this._dnaUrl()
    const data = await this.appState.apiGet(uri)
    this.loading = false
    this._matchDataLoading = false
    if ('data' in data) {
      this.error = false
      this._matchData = data.data
    }
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  updated(changed) {
    if (changed.has('homePersonGrampsId') && this.homePersonGrampsId) {
      this._setGrampsIdIfNeeded()
    }
    if (changed.has('grampsId')) {
      if (this.grampsId) {
        this._fetchMatchData()
        this._selectPersonByGrampsId()
      } else {
        this._setGrampsIdIfNeeded()
      }
    }
  }

  _selectPersonByGrampsId() {
    const select = this.shadowRoot.querySelector('md-filled-select')
    if (select) {
      select.select(this.grampsId)
    }
  }

  _setGrampsIdIfNeeded() {
    if (this.grampsId) {
      return
    }
    if (
      !this.grampsId &&
      this.homePersonGrampsId &&
      this._data.some(person => person.gramps_id === this.homePersonGrampsId)
    ) {
      this._goTo(`${this.page}/${this.homePersonGrampsId}`)
      return
    }
    if (this._data.length) {
      this._goTo(`${this.page}/${this._data[0].gramps_id}`)
    }
  }

  firstUpdated() {
    if (this.appState.i18n.lang) {
      // don't load before we have strings
      this._fetchSelectData()
    }
  }

  _fetchAllData() {
    this._fetchSelectData()
    this._fetchMatchData()
  }

  _disableEditMode() {
    this.edit = false
  }

  handleUpdateStaleData() {
    this._fetchAllData()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:delete', () => this._handleDelete())
    window.addEventListener('edit-mode:off', () => this._disableEditMode())
  }

  /* Methods to be implemented by child classes */

  renderContent() {
    return ''
  }

  _renderNoData() {
    return ''
  }

  get page() {
    return ''
  }

  _renderSelect() {
    return ''
  }

  _shouldLoadMatchData() {
    return true
  }

  _handleDelete() {}

  _handleClickAdd() {}

  _handleClickEdit() {}

  get _selectUrl() {
    return ''
  }

  get _dnaUrl() {
    return ''
  }
}
