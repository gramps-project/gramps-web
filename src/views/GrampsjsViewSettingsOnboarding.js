import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, getSettings, updateSettings} from '../api.js'
import '@material/mwc-textfield'
import '@material/mwc-button'
import '@material/mwc-select'


export class GrampsjsViewSettingsOnboarding extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      .red {
        --mdc-button-outline-color: #C62828;
        --mdc-theme-primary: #C62828;
      }

      mwc-select {
        width: 100%;
        max-width: 30em;
      }

      #complete-button {
        margin-top: 25px;
      }
    `]
  }


  static get properties() {
    return {
      _translations: {type: Object},
      _settings: {type: Object},
      _people: {type: Array},
      _langLoading: {type: Boolean},
      _peopleLoading: {type: Boolean}
    }
  }

  constructor() {
    super()
    this._translations = {}
    this._people = []
    this._settings = getSettings()
    this._langLoading = false
    this._peopleLoading = false
  }


  renderContent() {
    return html`

    <h3>${this._('Select language')}</h3>

    ${this.renderLangSelect()}

    <h3>${this._('Set _Home Person')}</h3>

    ${this.renderPersonSelect()}

    <mwc-button
      raised
      id="complete-button"
      label="${this._('Complete')}"
      icon="check_circle"
      ?disabled="${!this._isCompleted()}"
      @click=${() => this._doSubmit()}
    ></mwc-button>

    `
  }

  _isCompleted() {
    const personSelect = this.shadowRoot.getElementById('select-person')
    const langSelect = this.shadowRoot.getElementById('select-language')
    if (!personSelect || !langSelect) {
      return false
    }
    if (personSelect.value && langSelect.value) {
      return true
    }
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  _doSubmit() {
    this.dispatchEvent(new CustomEvent('onboarding:completed', {bubbles: true, composed: true}))
  }

  renderPersonSelect() {
    return html`
    <mwc-select
      id="select-person"
      label="${this._peopleLoading ? this._('Loading...') : this._('Home Person')}"
      @selected="${this._handlePersonSelected}"
      ?disabled="${this._peopleLoading}">
    ${this._people.map(obj => html`
      <mwc-list-item
        value="${obj.gramps_id}"
        ?selected="${obj.gramps_id === this._settings.homePerson}"
        >${obj.string}</mwc-list-item>
      `, this)}
    </mwc-select>
  `
  }

  renderLangSelect() {
    return html`
    <mwc-select
      id="select-language"
      label="${this._langLoading ? this._('Loading...') : this._('Language')}"
      @selected="${this._handleLangSelected}"
      ?disabled="${this._langLoading}">
    ${Object.keys(this._translations).map(key => html`
      <mwc-list-item
        value="${key}"
        ?selected="${key === this._settings.lang}"
        >${this._translations[key]}</mwc-list-item>
      `, this)}
    </mwc-select>
  `
  }

  _handleLangSelected(event) {
    const i = event.detail.index
    if (i !== null && i !== undefined) {
      const key = Object.keys(this._translations)[i]
      updateSettings({lang: key})
      this._handleStorage()
    }
  }

  _handlePersonSelected(event) {
    const i = event.detail.index
    if (i !== null && i !== undefined) {
      const grampsId = this._people[i].gramps_id
      updateSettings({homePerson: grampsId})
      this._handleStorage()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', this._handleStorage.bind(this))
  }

  _handleStorage() {
    this._settings = getSettings()
    window.dispatchEvent(new CustomEvent('settings:changed', {bubbles: true, composed: true}))
  }

  firstUpdated() {
    if (this.active) {
      this._fetchData()
    }
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      if(!this.loading && this._people.length === 0) {
        this._fetchData()
      }
    }
  }

  async _fetchData() {
    this.loading = true
    this._peopleLoading = true
    this._langLoading = true
    const dataTrans = await apiGet('/api/translations/')
    if ('data' in dataTrans) {
      this._translations = dataTrans.data
    } else if ('error' in dataTrans) {
      this.error = true
      this._errorMessage = dataTrans.error
      return
    }
    this._langLoading = false
    const dataPeople = await apiGet('/api/people/?profile=self&keys=gramps_id,profile')
    if ('data' in dataPeople) {
      this._people = dataPeople.data.map(obj =>({
        gramps_id: obj.gramps_id,
        string: `${obj.profile.name_given || '...'} ${obj.profile.name_surname || '...'}${obj.profile?.birth?.date ? ` * ${obj.profile?.birth?.date}` : ''}`
      })).sort((a, b) => a.string > b.string)
    } else if ('error' in dataPeople) {
      this.error = true
      this._errorMessage = dataPeople.error
      return
    }
    this._peopleLoading = false
    this.loading = false
  }


}


window.customElements.define('grampsjs-view-settings-onboarding', GrampsjsViewSettingsOnboarding)
