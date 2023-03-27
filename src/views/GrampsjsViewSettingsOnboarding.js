import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, getSettings, updateSettings} from '../api.js'
import '@material/mwc-button'
import '@material/mwc-menu'
import '../components/GrampsjsFormSelectObjectList.js'

export class GrampsjsViewSettingsOnboarding extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .red {
          --mdc-button-outline-color: #c62828;
          --mdc-theme-primary: #c62828;
        }

        mwc-select {
          width: 100%;
          max-width: 30em;
          margin-bottom: 10px;
        }

        #complete-button {
          margin-top: 25px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      requireHomePerson: {type: Boolean},
      _translations: {type: Array},
      _settings: {type: Object},
      _langLoading: {type: Boolean},
      _peopleLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this.requireHomePerson = false
    this._translations = []
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
    if (
      (!this.requireHomePerson || this._settings.homePerson) &&
      this._settings.lang
    ) {
      return true
    }
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  _doSubmit() {
    this.dispatchEvent(
      new CustomEvent('onboarding:completed', {bubbles: true, composed: true})
    )
  }

  renderPersonSelect() {
    return html`
      <p>
        <grampsjs-form-object-list
          .strings="${this.strings}"
          .objects=${this.homePersonDetails.handle
            ? [this.homePersonDetails]
            : []}
          id="homeperson-list"
        ></grampsjs-form-object-list>
      </p>
      <p>
        <grampsjs-form-select-object
          @select-object:changed="${this._handleHomePerson}"
          objectType="person"
          .strings="${this.strings}"
          id="homeperson-select"
          label="${this._('Select')}"
          ?disabled="${this._peopleLoading}"
        ></grampsjs-form-select-object>
      </p>
    `
  }

  _handleHomePerson(e) {
    const obj = e.detail.objects[0]
    if (obj.object?.gramps_id) {
      updateSettings({homePerson: obj.object.gramps_id}, true)
      this._handleStorage()
      this.homePersonDetails = obj
    }
    e.preventDefault()
    e.stopPropagation()
  }

  renderLangSelect() {
    return html`
      <mwc-select
        id="select-language"
        label="${this._langLoading
          ? this._('Loading items...')
          : this._('Language')}"
        @selected="${this._handleLangSelected}"
        ?disabled="${this._langLoading}"
      >
        ${this._translations.map(
          langObj => html`
            <mwc-list-item
              value="${langObj.language}"
              ?selected="${langObj.language === this._settings.lang}"
              >${langObj.native}</mwc-list-item
            >
          `,
          this
        )}
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

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('storage', this._handleStorage.bind(this))
  }

  _handleStorage() {
    this._settings = getSettings()
    window.dispatchEvent(
      new CustomEvent('settings:changed', {bubbles: true, composed: true})
    )
  }

  firstUpdated() {
    if (this.active) {
      this._fetchDataLang()
      this._fetchDataHomePerson()
    }
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active') && this.active) {
      if (!this._langLoading && this._translations.length === 0) {
        this._fetchDataLang()
      }
      if (
        !this._peopleLoading &&
        this.homePersonDetails?.object?.grampd_id !== this._settings.homePerson
      ) {
        this._fetchDataHomePerson()
      }
    }
  }

  async _fetchDataLang() {
    this.loading = true
    this._langLoading = true
    const dataTrans = await apiGet('/api/translations/')
    if ('data' in dataTrans) {
      this.error = false
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

  async _fetchDataHomePerson() {
    if (
      this._settings.homePerson &&
      this.homePersonDetails?.object?.grampd_id !== this._settings.homePerson
    ) {
      this.loading = true
      this._peopleLoading = true
      const seachPhrase = `${this._settings.homePerson}`
      const dataPeople = await apiGet(
        `/api/search/?locale=${
          this.strings?.__lang__ || 'en'
        }&profile=self&query=${encodeURIComponent(
          `${seachPhrase} AND type:person`
        )}`
      )
      if ('data' in dataPeople) {
        this.error = false
        ;[this.homePersonDetails] = dataPeople.data.filter(
          obj => obj.object?.gramps_id === this._settings.homePerson
        )
      } else if ('error' in dataPeople) {
        this.error = true
        this._errorMessage = dataPeople.error
        return
      }
      this._peopleLoading = false
      if (!this._langLoading) {
        this.loading = false
      }
    }
  }
}

window.customElements.define(
  'grampsjs-view-settings-onboarding',
  GrampsjsViewSettingsOnboarding
)
