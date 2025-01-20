import {css, html} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'
import '@material/web/select/filled-select'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTasks.js'
import '../components/GrampsjsDnaMatches.js'
import '../components/GrampsjsDnaMatch.js'
import '../components/GrampsjsFormNewMatch.js'
import '../components/GrampsjsChromosomeBrowser.js'
import '../components/GrampsjsBreadcrumbs.js'
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
          margin-bottom: 30px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      canEdit: {type: Boolean},
      chromosome: {type: Boolean},
      dialogContent: {type: String},
      grampsId: {type: String},
      grampsIdMatch: {type: String},
      homePersonGrampsId: {type: String},
      matches: {type: Boolean},
      _data: {type: Array},
      _matchData: {type: Array},
      _matchDataLoading: {type: Boolean},
      _selectDataLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.canEdit = false
    this.chromosome = false
    this.dialogContent = ''
    this.grampsId = ''
    this.grampsIdMatch = ''
    this.homePersonGrampsId = ''
    this.matches = false
    this._data = []
    this._matchData = []
    this._matchDataLoading = false
    this._selectDataLoading = false
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
        <md-primary-tab
          @click="${() =>
            this._goTo(
              this.grampsId ? `dna-matches/${this.grampsId}` : 'dna-matches'
            )}"
          ?active="${this.matches}"
          >${this._('Matches')}</md-primary-tab
        >
        <md-primary-tab
          @click="${() =>
            this._goTo(
              this.grampsId
                ? `dna-chromosome/${this.grampsId}`
                : 'dna-chromosome'
            )}"
          ?active="${this.chromosome}"
          >${this._('Chromosome Browser')}</md-primary-tab
        >
      </md-tabs>
    `
  }

  _goTo(path) {
    fireEvent(this, 'nav', {path})
  }

  get page() {
    return this.matches ? 'dna-matches' : 'dna-chromosome'
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
              value="${person.gramps_id}"
              ?selected="${person.gramps_id === this.grampsId}"
              >${personDisplayName(person)}</md-select-option
            >
          `
        )}
      </md-filled-select>
    `
  }

  _renderMatches() {
    return this.grampsIdMatch
      ? this._renderSingleMatch()
      : this._renderAllMatches()
  }

  _renderSingleMatch() {
    return html`
      <grampsjs-dna-match
        .data="${this._matchData.find(
          match => match.handle === this._getSelectedMatchHandle()
        ) ?? {}}"
        .personMatch="${this._allPeople.find(
          person => person.gramps_id === this.grampsIdMatch
        ) ?? {}}"
        .person="${this._data.find(
          person => person.gramps_id === this.grampsId
        ) ?? {}}"
        .strings="${this.strings}"
      ></grampsjs-dna-match>
    `
  }

  _renderAllMatches() {
    return html`
      <div class="container">
        <grampsjs-dna-matches
          .data="${this._matchData}"
          .strings="${this.strings}"
          .person="${this._data.find(
            person => person.gramps_id === this.grampsId
          )}"
          ?loading="${this._matchDataLoading}"
          @dna-matches:row-selected="${this._handleRowSelected}"
        ></grampsjs-dna-matches>
      </div>
    `
  }

  get _allPeople() {
    return this._data.reduce((people, person) => {
      people.push(person)
      if (person.extended?.people?.length) {
        people.push(...person.extended.people)
      }
      return people
    }, [])
  }

  _handleRowSelected(e) {
    const {rowNumber} = e.detail
    const handleMatch = this._matchData[rowNumber].handle
    const match = this._allPeople.find(person => person.handle === handleMatch)
    const grampsIdMatch = match?.gramps_id
    this._goTo(`${this.page}/${this.grampsId}/${grampsIdMatch}`)
  }

  _getSelectedMatchHandle() {
    const personMatch = this._allPeople.find(
      person => person.gramps_id === this.grampsIdMatch
    )
    return personMatch?.handle
  }

  _renderChromosome() {
    return html`
      <div class="container">
        <grampsjs-chromosome-browser
          .data="${this._matchData}"
          .strings="${this.strings}"
          .person="${this._data.find(
            person => person.gramps_id === this.grampsId
          )}"
          ?loading="${this._matchDataLoading}"
        ></grampsjs-chromosome-browser>
      </div>
    `
  }

  get selectedPerson() {
    return this._data.find(person => person.gramps_id === this.grampsId)
  }

  renderFab() {
    return this.grampsIdMatch
      ? html`<mwc-fab icon="edit" @click=${this._handleClickEdit}></mwc-fab>`
      : html`<mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab>`
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

  _handleClickEdit() {
    fireEvent(this, 'edit-mode:on', {
      title: 'Edit Match',
      saveButton: true,
    })
  }

  async _handleSaveMatch(e) {
    const sourceHandle = e.detail.data.source_handle
    const targetHandle = e.detail.data.target_handle
    const personData = await apiGet(`/api/people/${sourceHandle}`)
    const {extended, profile, ...person} = personData.data
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
    const grampsId = this.renderRoot.querySelector('md-filled-select').value
    this._goTo(`${this.page}/${grampsId}`)
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
    const grampsIdHasMatches = this._data.some(
      person => person.gramps_id === this.grampsId
    )
    const grampsIdHasMatchData = this._matchData.some(
      match => match.handle && match.handle === this.selectedHandle
    )
    if (
      grampsIdHasMatches &&
      !grampsIdHasMatchData &&
      !this._matchDataLoading
    ) {
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
    if ('__lang__' in this.strings) {
      // don't load before we have strings
      this._fetchData()
    }
  }

  _fetchAllData() {
    this._fetchData()
    this._fetchMatchData()
  }

  async _deleteMatch() {
    const handle = this.selectedHandle
    const {grampsId} = this
    const {grampsIdMatch} = this
    const handleMatch = this._getSelectedMatchHandle()
    if (this.active && handle && handleMatch) {
      const url = `/api/people/${handle}`
      const personData = await apiGet(url)
      const person = personData.data
      if (!person.handle) {
        return
      }
      const payload = {
        ...person,
        person_ref_list: person.person_ref_list.filter(
          ref => ref.ref !== handleMatch
        ),
      }
      const data = await apiPut(url, payload, true, false)
      if ('data' in data) {
        fireEvent(this, 'db:changed')
        this._goTo(`dna-matches/${grampsId}`)
        fireEvent(this, 'transaction:undo', {
          message: this._('DNA match with %s deleted.', grampsIdMatch),
          transaction: data.data,
          redirect: `dna-matches/${grampsId}`,
        })
      } else if ('error' in data) {
        fireEvent(this, 'grampsjs:error', {message: data.error})
      }
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', () => this._fetchAllData())
    window.addEventListener('edit-mode:delete', () => this._deleteMatch())
  }
}

window.customElements.define(
  'grampsjs-view-dna-matches',
  GrampsjsViewDnaMatches
)
