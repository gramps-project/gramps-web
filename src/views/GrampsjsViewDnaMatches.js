import {html} from 'lit'

import '@material/web/select/filled-select'

import '../components/GrampsjsTasks.js'
import '../components/GrampsjsDnaMatches.js'
import '../components/GrampsjsDnaMatch.js'
import '../components/GrampsjsFormNewMatch.js'
import '../components/GrampsjsChromosomeBrowser.js'
import '../components/GrampsjsBreadcrumbs.js'

import {GrampsjsViewDnaBase} from './GrampsjsViewDnaBase.js'

import {fireEvent, personDisplayName} from '../util.js'

export class GrampsjsViewDnaMatches extends GrampsjsViewDnaBase {
  static get properties() {
    return {
      chromosome: {type: Boolean},
      matches: {type: Boolean},
      grampsIdMatch: {type: String},
    }
  }

  constructor() {
    super()
    this.chromosome = false
    this.matches = false
    this.grampsIdMatch = ''
  }

  /* Implemented abstract methods */

  renderFab() {
    return this.grampsIdMatch
      ? html`<mwc-fab icon="edit" @click=${this._handleClickEdit}></mwc-fab>`
      : html`<mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab>`
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    return ''
  }

  renderContent() {
    if (this._selectDataLoading || this._dnaDataLoading) {
      return this.renderLoading()
    }
    if (this.matches) {
      return this._renderMatches()
    }
    if (this.chromosome) {
      return this._renderChromosome()
    }
    return ''
  }

  _renderNoData() {
    return html`<div>
      ${this._('No DNA matches found.')}
      ${this.grampsId && this._data.length
        ? this._('Please select a different person.')
        : ''}
    </div>`
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

  _shouldLoadDnaData() {
    const grampsIdHasDnaData =
      Array.isArray(this._dnaData.data) &&
      this._dnaData.data.some(
        match => match.handle && match.handle === this.selectedHandle
      )
    return (
      this._selectDataHasGrampsId() &&
      !grampsIdHasDnaData &&
      !this._dnaData.dataLoading
    )
  }

  _handleDelete() {
    this._deleteMatch()
  }

  _handleClickAdd() {
    this.dialogContent = html`
      <grampsjs-form-new-match
        .appState="${this.appState}"
        @object:save="${this._handleSaveMatch}"
        @object:cancel="${this._handleCancelDialog}"
        dialogTitle=${this._('Add new DNA match')}
        .sourcePersonInitial=${this.selectedPerson ?? {}}
      >
      </grampsjs-form-new-match>
    `
  }

  _handleClickEdit() {
    fireEvent(this, 'edit-mode:on', {
      title: 'Edit Match',
      saveButton: true,
    })
    this.edit = true
  }

  get _selectUrl() {
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
      this.appState.i18n.lang || 'en'
    }&sort=name&extend=person_ref_list&profile=references`
    return uri
  }

  _dnaUrl() {
    const uri = `/api/people/${this.selectedHandle}/dna/matches?locale=${
      this.appState.i18n.lang || 'en'
    }&raw=1`
    return uri
  }

  /* Methods specific to this class */

  _renderMatches() {
    return this.grampsIdMatch
      ? this._renderSingleMatch()
      : this._renderAllMatches()
  }

  _renderSingleMatch() {
    return html`
      <grampsjs-dna-match
        .edit="${this.edit}"
        .data="${this._dnaData.data.find(
          match => match.handle === this._getSelectedMatchHandle()
        ) ?? {}}"
        .personMatch="${this._allPeople.find(
          person => person.gramps_id === this.grampsIdMatch
        ) ?? {}}"
        .person="${this._data.find(
          person => person.gramps_id === this.grampsId
        ) ?? {}}"
        .appState="${this.appState}"
      ></grampsjs-dna-match>
    `
  }

  _renderAllMatches() {
    return html`
      <div class="container">
        <grampsjs-dna-matches
          .data="${Array.isArray(this._dnaData.data) ? this._dnaData.data : []}"
          .appState="${this.appState}"
          .person="${this._data.find(
            person => person.gramps_id === this.grampsId
          )}"
          ?loading="${this._dnaData.dataLoading}"
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
    const handleMatch = this._dnaData.data[rowNumber].handle
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
          .data="${Array.isArray(this._dnaData.data) ? this._dnaData.data : []}"
          .appState="${this.appState}"
          .person="${this._data.find(
            person => person.gramps_id === this.grampsId
          )}"
          ?loading="${this._dnaData.dataLoading}"
        ></grampsjs-chromosome-browser>
      </div>
    `
  }

  get selectedPerson() {
    return this._data.find(person => person.gramps_id === this.grampsId)
  }

  async _handleSaveMatch(e) {
    const sourceHandle = e.detail.data.source_handle
    const targetHandle = e.detail.data.target_handle
    const personData = await this.appState.apiGet(`/api/people/${sourceHandle}`)
    const {extended, profile, ...person} = personData.data
    const noteHandle = await this._createNote(e.detail.data.raw_data[0])
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
    await this.appState.apiPut(`/api/people/${sourceHandle}`, updatedPerson)
    this.dialogContent = ''
  }

  async _createNote(noteContent) {
    const note = {
      _class: 'Note',
      text: {_class: 'StyledText', string: noteContent},
    }
    const data = await this.appState.apiPost('/api/notes/', note, true, false)
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

  get selectedHandle() {
    return this._data.find(person => person.gramps_id === this.grampsId)?.handle
  }

  async _deleteMatch() {
    const handle = this.selectedHandle
    const {grampsId} = this
    const {grampsIdMatch} = this
    const handleMatch = this._getSelectedMatchHandle()
    if (this.active && handle && handleMatch) {
      const url = `/api/people/${handle}`
      const personData = await this.appState.apiGet(url)
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
      const data = await this.appState.apiPut(url, payload, {dbChanged: false})
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
}

window.customElements.define(
  'grampsjs-view-dna-matches',
  GrampsjsViewDnaMatches
)
