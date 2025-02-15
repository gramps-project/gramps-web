import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
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
      _langLoading: {type: Boolean},
      _peopleLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this.requireHomePerson = false
    this._translations = []
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
      (!this.requireHomePerson || this.appState.settings.homePerson) &&
      this.appState.settings.lang
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
          .appState="${this.appState}"
          .objects=${this.homePersonDetails?.handle
            ? [this.homePersonDetails]
            : []}
          id="homeperson-list"
        ></grampsjs-form-object-list>
      </p>
      <p>
        <grampsjs-form-select-object
          @select-object:changed="${this._handleHomePerson}"
          objectType="person"
          .appState="${this.appState}"
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
      this.appState.updateSettings({homePerson: obj.object.gramps_id}, true)
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
              ?selected="${langObj.language === this.appState.settings.lang}"
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
      this.appState.updateSettings({lang: key})
    }
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
        this.homePersonDetails?.object?.grampd_id !==
          this.appState.settings.homePerson
      ) {
        this._fetchDataHomePerson()
      }
    }
  }

  async _fetchDataLang() {
    this.loading = true
    this._langLoading = true
    const dataTrans = await this.appState.apiGet('/api/translations/')
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
      this.appState.settings.homePerson &&
      this.homePersonDetails?.object?.grampd_id !==
        this.appState.settings.homePerson
    ) {
      this.loading = true
      this._peopleLoading = true
      const dataPeople = await this.appState.apiGet(
        `/api/people/?locale=${this.appState.i18n.lang || 'en'}&gramps_id=${
          this.appState.settings.homePerson
        }&profile=self&extend=media_list`
      )
      if ('data' in dataPeople) {
        this.error = false
        const [details] = dataPeople.data
        if (details !== undefined) {
          this.homePersonDetails = {
            object_type: 'person',
            object: details,
            handle: details.handle,
          }
        }
      } else if ('error' in dataPeople) {
        this.error = true
        this._errorMessage = dataPeople.error
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
