import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'
import '@material/web/select/filled-select'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTasks.js'
import '../components/GrampsjsDnaMatches.js'
import '../components/GrampsjsFormNewMatch.js'
import {apiGet, apiPut, apiPost} from '../api.js'
import {fireEvent, personDisplayName} from '../util.js'

export class GrampsjsViewDnaMatches extends GrampsjsView {
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
        }

        md-primary-tab {
          flex: 0 0 auto;
          width: auto;
        }

        md-filled-select {
          --md-filled-select-text-field-input-text-font-size: 24px;
        }

        .container {
          margin-top: 40px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      chromosome: {type: Boolean},
      matches: {type: Boolean},
      _data: {type: Array},
      canEdit: {type: Boolean},
      selectedHandle: {type: String},
      homePersonHandle: {type: String},
      _matchData: {type: Array},
      _selectDataLoading: {type: Boolean},
      _matchDataLoading: {type: Boolean},
      dialogContent: {type: String},
    }
  }

  constructor() {
    super()
    this.chromosome = false
    this.matches = false
    this.canEdit = false
    this._data = []
    this.selectedHandle = ''
    this.homePersonHandle = ''
    this._matchData = []
    this._selectDataLoading = false
    this._matchDataLoading = false
    this.dialogContent = ''
  }

  render() {
    return html`
      ${this._renderTabs()} ${this._renderSelect()}
      ${this.matches ? this._renderMatches() : ''}
      ${this.chromosome ? this._renderChromosome() : ''}
      ${this.canEdit ? this.renderFab() : ''} ${this.dialogContent}
    `
  }

  _renderTabs() {
    return html`
      <md-tabs>
        <md-primary-tab @click="${() => this._goTo('dna/matches')}"
          >${this._('Matches')}</md-primary-tab
        >
        <md-primary-tab @click="${() => this._goTo('dna/chromosome')}"
          >${this._('Chromosome Browser')}</md-primary-tab
        >
      </md-tabs>
    `
  }

  _goTo(path) {
    fireEvent(this, 'nav', {path})
  }

  _renderSelect() {
    if (this._selectDataLoading) {
      return html`<md-filled-select disabled id="placeholder"
        >${this._('Loading items...')}</md-filled-select
      >`
    }
    return html`
      <md-filled-select @change="${this._handleSelectChange}">
        ${this._data.map(
          person => html`
            <md-select-option
              value="${person.handle}"
              ?selected="${person.handle === this.selectedHandle}"
              >${personDisplayName(person)}</md-select-option
            >
          `
        )}
      </md-filled-select>
    `
  }

  _renderMatches() {
    return html`
      <div class="container">
        <grampsjs-dna-matches
          .data="${this._matchData}"
          .strings="${this.strings}"
          .person="${this._data.find(
            person => person.handle === this.selectedHandle
          )}"
          ?loading="${this._matchDataLoading}"
        ></grampsjs-dna-matches>
      </div>
    `
  }

  _renderChromosome() {
    return html`
      <div class="container">
        <grampsjs-chromosome-browser
          .data="${this._matchData}"
          .strings="${this.strings}"
          .person="${this._data.find(
            person => person.handle === this.selectedHandle
          )}"
          ?loading="${this._matchDataLoading}"
        ></grampsjs-chromosome-browser>
      </div>
    `
  }

  get selectedPerson() {
    return this._data.find(person => person.handle === this.selectedHandle)
  }

  renderFab() {
    return html`<mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab>`
  }

  _handleClickAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-match
        .strings="${this.strings}"
        @object:save="${this._handleSaveMatch}"
        @object:cancel="${this._handleCancelDialog}"
        dialogTitle=${this._('Add new DNA match')}
        .sourcePersonInitial=${this.selectedPerson}
      >
      </grampsjs-form-new-match>
    `
  }

  async _handleSaveMatch(e) {
    const sourceHandle = e.detail.data.source_handle
    const targetHandle = e.detail.data.target_handle
    const personFull = this._data.find(person => person.handle === sourceHandle)
    if (personFull === undefined) {
      return
    }
    const {extended, profile, ...person} = personFull
    const noteHandle = await this._createNote(e.detail.data.raw_data)
    const newPersonRef = {
      _class: 'PersonRef',
      ref: targetHandle,
      rel: 'DNA',
      note_list: [noteHandle],
    }
    const updatedPerson = {
      ...person,
      person_ref_list: [...person.person_ref_list, newPersonRef],
    }
    await apiPut(`/api/people/${sourceHandle}`, updatedPerson)
    this.dialogContent = ''
  }

  async _createNote(noteContent) {
    const note = {
      _class: 'Note',
      text: {_class: 'StyledText', string: noteContent},
    }
    const data = await apiPost('/api/notes/', note, true, false)
    let noteHandle
    if ('data' in data) {
      this.error = false
      noteHandle = data.data?.[0]?.new?.handle
      if (noteHandle === undefined) {
        this.error = true
        this._errorMessage = this._('Error creating note')
        return ''
      }
      return noteHandle
    }
    if ('error' in data) {
      this.error = data
      this._errorMessage = data.error
      return ''
    }
    return ''
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleSelectChange() {
    this.selectedHandle =
      this.shadowRoot.querySelector('md-filled-select').value
  }

  async _fetchData() {
    this.loading = true
    this._selectDataLoading = true
    const rules = {
      rules: [
        {
          name: 'HasAssociationType',
          values: ['DNA'],
        },
      ],
    }
    const uri = `/api/people/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.strings.__lang__ || 'en'
    }&sort=name&extend=person_ref_list&profile=references`
    const data = await apiGet(uri)
    this.loading = false
    this._selectDataLoading = false
    if ('data' in data) {
      this.error = false
      this._data = data.data
      this._setSelectedHandle()
    }
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchMatchData() {
    this.loading = true
    this._matchDataLoading = true
    const uri = `/api/people/${this.selectedHandle}/dna/matches?locale=${
      this.strings.__lang__ || 'en'
    }`
    const data = await apiGet(uri)
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
    if (changed.has('homePersonHandle') && this.homePersonHandle) {
      this._setSelectedHandle()
    }
    if (changed.has('selectedHandle') && this.selectedHandle) {
      this._fetchMatchData()
    }
  }

  _setSelectedHandle() {
    if (
      this.selectedHandle &&
      this._data.some(person => person.handle === this.selectedHandle)
    ) {
      return
    }
    if (
      !this.selectedHandle &&
      this.homePersonHandle &&
      this._data.some(person => person.handle === this.homePersonHandle)
    ) {
      this.selectedHandle = this.homePersonHandle
      return
    }
    if (this._data.length) {
      this.selectedHandle = this._data[0].handle
    }
  }

  firstUpdated() {
    if ('__lang__' in this.strings) {
      // don't load before we have strings
      this._fetchData()
    }
  }

  _fetchAllData() {
    this._fetchData()
    this._fetchMatchData()
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', () => this._fetchAllData())
  }
}

window.customElements.define(
  'grampsjs-view-dna-matches',
  GrampsjsViewDnaMatches
)
