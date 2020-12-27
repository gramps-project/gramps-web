import {html, css} from 'lit-element'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, getSettings, updateSettings} from '../api.js'
import {debounce} from '../util.js'
import '@material/mwc-textfield'
import '@material/mwc-button'
import '@material/mwc-menu'


export class GrampsjsViewSettingsOnboarding extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      .red {
        --mdc-button-outline-color: #C62828;
        --mdc-theme-primary: #C62828;
      }

      mwc-select, mwc-textfield {
        width: 100%;
        max-width: 30em;
        margin-bottom: 10px;
      }

      #complete-button {
        margin-top: 25px;
      }

      #home-person-menu {
        max-height: 5em;
      }
    `]
  }


  static get properties() {
    return {
      _translations: {type: Array},
      _settings: {type: Object},
      _people: {type: Array},
      _langLoading: {type: Boolean},
      _peopleLoading: {type: Boolean}
    }
  }

  constructor() {
    super()
    this._translations = []
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
    if (this._settings.homePerson && this._settings.lang) {
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
    <div style="position: relative;">
      <mwc-textfield
        iconTrailing="keyboard"
        id="select-person"
        label="${this._('Select...')}"
        @input="${debounce(() => this._fetchDataPeople(), 500)}"
        >
      </mwc-textfield>
      <p>${this._settings.homePerson && this._people.length ?
    `${this._('Selected')}: ${this._people.filter(obj => obj.gramps_id === this._settings.homePerson)[0].string}` : ''}
      </p>
      <mwc-menu id="home-person-menu" style="position: relative;">
      ${this._people.map(obj => html`
        <mwc-list-item
          value="${obj.gramps_id}"
          @click="${() => this._handlePersonSelected(obj.gramps_id)}"
          >${obj.string}</mwc-list-item>
        `, this)}
      </mwc-menu>
    </div>
  `
  }

  _openMenu() {
    const textField = this.shadowRoot.getElementById('select-person')
    if (textField.value && this._people.length) {
      const menu = this.shadowRoot.getElementById('home-person-menu')
      menu.anchor = textField
      menu.open = true
    }
  }


  renderLangSelect() {
    return html`
    <mwc-select
      id="select-language"
      label="${this._langLoading ? this._('Loading items...') : this._('Language')}"
      @selected="${this._handleLangSelected}"
      ?disabled="${this._langLoading}">
    ${this._translations.map(langObj => html`
      <mwc-list-item
        value="${langObj.language}"
        ?selected="${langObj.language === this._settings.lang}"
        >${langObj.native}</mwc-list-item>
      `, this)}
    </mwc-select>
  `
  }

  _handleLangSelected(event) {
    const i = event.detail.index
    if (i !== null && i !== undefined && i < this._translations.length) {
      const key = this._translations[i].language
      updateSettings({lang: key})
      this._handleStorage()
    }
  }

  _handlePersonSelected(grampsId) {
    if (grampsId) {
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
      this._fetchDataLang()
      this._fetchDataPeople()
    }
    const textField = this.shadowRoot.getElementById('select-person')
    const menu = this.shadowRoot.getElementById('home-person-menu')
    menu.anchor = textField
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      if(!this._langLoading && this._translations.length === 0) {
        this._fetchDataLang()
      }
    }
  }

  async _fetchDataLang() {
    this.loading = true
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
    if (!this._peopleLoading) {
      this.loading = false
    }
  }

  async _fetchDataPeople() {
    const textField = this.shadowRoot.getElementById('select-person')
    this.loading = true
    this._peopleLoading = true
    const seachPhrase = this._settings.homePerson? `(${textField.value} OR ${this._settings.homePerson})` : textField.value
    const dataPeople = await apiGet(`/api/search/?locale=${this.strings?.__lang__ || 'en'}&profile=self&query=${encodeURIComponent(`${seachPhrase} AND type:person`)}`)
    if ('data' in dataPeople) {
      this._people = dataPeople.data.map(obj =>({
        gramps_id: obj.object.gramps_id,
        string: `${obj.object.profile.name_given || '...'} ${obj.object.profile.name_surname || '...'}${obj.object.profile?.birth?.date ? ` * ${obj.object.profile?.birth?.date}` : ''}`
      })).sort((a, b) => a.string > b.string)
    } else if ('error' in dataPeople) {
      this.error = true
      this._errorMessage = dataPeople.error
      return
    }
    this._openMenu()
    this._peopleLoading = false
    if (!this._langLoading) {
      this.loading = false
    }
  }


}


window.customElements.define('grampsjs-view-settings-onboarding', GrampsjsViewSettingsOnboarding)
