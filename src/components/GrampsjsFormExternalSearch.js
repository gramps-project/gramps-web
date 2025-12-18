/* eslint-disable class-methods-use-this */
/*
Form to get parameters for find more details about a person from other websites
*/

import {css, html} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'
import '@material/web/textfield/outlined-text-field'
import '@material/web/button/text-button'
import '@material/web/button/filled-button'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/icon/icon.js'
import {
  mdiOpenInNew,
  mdiEarth,
  mdiShieldAccount,
  mdiLock,
  mdiCog,
  mdiEye,
  mdiEyeOff,
  mdiCogOff,
  mdiPlus,
  mdiDelete,
} from '@mdi/js'
import {renderIcon} from '../icons.js'
import {updateSettings, getSettings} from '../api.js'
import {clickKeyHandler, makeHandle} from '../util.js'
import './GrampsjsFormSelectType.js'
import './GrampsjsIcon.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

const EXTERNAL_SEARCH_WEBSITES = [
  {
    key: 'compgen',
    value: 'CompGen',
    websiteCriteria: {
      reqRegistration: false,
      reqSubscription: false,
    },
    baseUrl: 'https://meta.genealogy.net/search',
    params: '?lastname={{name_surname}}&place={{place_name}}',
  },
  {
    key: 'familySearch',
    value: 'FamilySearch',
    websiteCriteria: {
      reqRegistration: true,
      reqSubscription: false,
    },
    baseUrl: 'https://familysearch.org/en/search/tree/results',
    params:
      '?q.anyPlace={{place_name}}&q.givenName={{name_given}}&q.surname={{name_surname}}',
  },
  {
    key: 'ancestry',
    value: 'Ancestry',
    websiteCriteria: {
      reqRegistration: false,
      reqSubscription: true,
    },
    baseUrl: 'https://www.ancestry.com/search',
    params:
      '?name={{name_given}}_{{name_surname}}&event={{place_name}}&searchMode=advanced',
  },
]

class GrampsjsFormExternalSearch extends GrampsjsObjectForm {
  static get properties() {
    return {
      editMode: {type: Boolean},
      hiddenWebsites: {type: Object},
      showAddForm: {type: Boolean},
      customEngines: {type: Array},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.hiddenWebsites = this._loadHiddenWebsites()
    this.showAddForm = false
    this.customEngines = this._loadCustomEngines()
  }

  _loadCustomEngines() {
    const settings = getSettings()
    return settings?.externalSearchCustom || []
  }

  _saveCustomEngines() {
    updateSettings({externalSearchCustom: this.customEngines})
  }

  _loadHiddenWebsites() {
    const settings = getSettings()
    return settings?.externalSearchHidden || {}
  }

  _saveHiddenWebsites() {
    updateSettings({externalSearchHidden: this.hiddenWebsites})
  }

  _toggleEditMode() {
    this.editMode = !this.editMode
  }

  _toggleWebsiteVisibility(key) {
    this.hiddenWebsites = {
      ...this.hiddenWebsites,
      [key]: !this.hiddenWebsites[key],
    }
    this._saveHiddenWebsites()
  }

  _toggleAddForm() {
    this.showAddForm = !this.showAddForm
  }

  _handleAddCustomEngine(e) {
    e.preventDefault()
    const nameField = this.renderRoot.querySelector('#custom-name')
    const urlField = this.renderRoot.querySelector('#custom-url')

    const name = nameField?.value?.trim()
    const url = urlField?.value?.trim()

    if (!name || !url) {
      return
    }

    const key = `custom_${makeHandle()}`
    this.customEngines = [...this.customEngines, {key, name, url}]
    this._saveCustomEngines()

    nameField.value = ''
    urlField.value = ''
    this.showAddForm = false
  }

  _deleteCustomEngine(key) {
    this.customEngines = this.customEngines.filter(engine => engine.key !== key)
    this._saveCustomEngines()
  }

  static get styles() {
    return [
      super.styles,
      css`
        .meta-icon {
          display: inline-flex;
          align-items: center;
        }
        .meta-icon svg {
          height: 0.8em;
          margin-bottom: 2px;
        }
        .legend {
          display: flex;
          gap: 1em;
          margin-top: 1em;
          margin-bottom: 0;
          padding-top: 1em;
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          font-size: 0.9em;
          color: var(--grampsjs-body-font-color-70);
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.3em;
        }
        .legend-item svg {
          height: 0.9em;
          margin-bottom: 1px;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 0.5em;
          margin-bottom: 0.5em;
        }
        md-icon-button {
          --md-icon-button-icon-size: 18px;
          width: 32px;
          height: 32px;
        }
        .item-hidden {
          opacity: 0.4;
        }
        .eye-icon {
          cursor: pointer;
        }
        .add-button-container {
          display: flex;
          align-items: center;
          gap: 0.3em;
          margin-top: 0.5em;
        }
        .add-button-text {
          cursor: pointer;
          color: var(--md-sys-color-primary);
          font-size: 0.95em;
        }
        .add-button-text:hover {
          opacity: 0.8;
        }
        .add-form {
          margin: 1em 0;
          padding: 1em;
          border: 1px solid var(--grampsjs-body-font-color-15);
          border-radius: 4px;
        }
        .add-form md-outlined-text-field {
          width: 100%;
          margin-bottom: 0.5em;
        }
        .add-form-help {
          font-size: 0.85em;
          color: var(--grampsjs-body-font-color-60);
          margin-bottom: 0.75em;
          line-height: 1.4;
        }
        .add-form-buttons {
          display: flex;
          gap: 0.5em;
          justify-content: flex-end;
        }
      `,
    ]
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '')
  }

  getExternalSearchWebsitesData() {
    const builtIn = EXTERNAL_SEARCH_WEBSITES.map(website => ({
      ...website,
      baseUrl: this.interpolateTemplate(website.baseUrl, this.data),
      params: this.interpolateTemplate(website.params, this.data),
    }))

    const custom = this.customEngines.map(engine => ({
      key: engine.key,
      value: engine.name,
      websiteCriteria: {
        reqRegistration: false,
        reqSubscription: false,
      },
      baseUrl: this.interpolateTemplate(engine.url, this.data),
      params: '',
      isCustom: true,
    }))

    return [...builtIn, ...custom]
  }

  getWebCriteriaIcon(websiteCriteria, isCustom) {
    if (isCustom) return null
    if (websiteCriteria.reqSubscription) return mdiLock
    if (websiteCriteria.reqRegistration) return mdiShieldAccount
    return mdiEarth
  }

  _getListItemIcon(web) {
    if (!this.editMode) {
      return renderIcon(mdiOpenInNew, 'var(--grampsjs-body-font-color-100)')
    }
    if (web.isCustom) {
      return renderIcon(mdiDelete, 'var(--grampsjs-body-font-color-100)')
    }
    const icon = this.hiddenWebsites[web.key] ? mdiEyeOff : mdiEye
    return renderIcon(icon, 'var(--grampsjs-body-font-color-100)')
  }

  _handleWebsiteClick(e, web) {
    if (!this.editMode) return
    e.preventDefault()
    if (web.isCustom) {
      this._deleteCustomEngine(web.key)
    } else {
      this._toggleWebsiteVisibility(web.key)
    }
  }

  _renderHeader() {
    return html`
      <div class="header">
        <span>
          ${this._('Search external services for matching records.')}
        </span>
        <md-icon-button @click="${this._toggleEditMode}">
          <grampsjs-icon
            .path="${this.editMode ? mdiCogOff : mdiCog}"
            color="var(--grampsjs-body-font-color-40)"
          ></grampsjs-icon>
        </md-icon-button>
      </div>
    `
  }

  _renderWebsiteItem(web) {
    const metaIcon = this.getWebCriteriaIcon(web.websiteCriteria, web.isCustom)
    return html`
      <div class="${this.hiddenWebsites[web.key] ? 'item-hidden' : ''}">
        <md-list-item
          type="button"
          href="${this.editMode ? '' : `${web.baseUrl}${web.params}`}"
          target="${this.editMode ? '' : '_blank'}"
          @click="${e => this._handleWebsiteClick(e, web)}"
        >
          <span class="icon ${this.editMode ? 'eye-icon' : ''}">
            ${this._getListItemIcon(web)}
          </span>
          <span> ${web.value} </span>
          ${metaIcon
            ? html`<span class="meta-icon">
                ${renderIcon(metaIcon, 'var(--grampsjs-body-font-color-60)')}
              </span>`
            : ''}
        </md-list-item>
      </div>
    `
  }

  _renderWebsiteList(visibleWebUrls) {
    return html`
      <md-list>
        ${visibleWebUrls.map(web => this._renderWebsiteItem(web))}
      </md-list>
    `
  }

  _renderAddCustomEngineForm() {
    if (!this.showAddForm) return ''
    return html`
      <div class="add-form">
        <div class="add-form-help">
          ${this._(
            'Enter a search URL with template variables for person data. Available variables:'
          )}
          <strong>{{name_given}}, {{name_surname}}, {{place_name}}</strong>
        </div>
        <md-outlined-text-field
          id="custom-name"
          label="${this._('Name')}"
          placeholder="${this._('e.g., MyGenealogy')}"
        >
        </md-outlined-text-field>
        <md-outlined-text-field
          id="custom-url"
          label="${this._('Search URL')}"
          placeholder="https://example.com/search?name={{name_given}}_{{name_surname}}"
        >
        </md-outlined-text-field>
        <div class="add-form-buttons">
          <md-text-button @click="${this._toggleAddForm}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleAddCustomEngine}">
            ${this._('Add')}
          </md-filled-button>
        </div>
      </div>
    `
  }

  _renderAddCustomEngine() {
    if (!this.editMode) return ''
    return html`
      <div class="add-button-container">
        <md-icon-button @click="${this._toggleAddForm}">
          <grampsjs-icon
            .path="${mdiPlus}"
            color="var(--md-sys-color-primary)"
          ></grampsjs-icon>
        </md-icon-button>
        <span
          class="add-button-text"
          @click="${this._toggleAddForm}"
          @keydown="${clickKeyHandler}"
          tabindex="0"
        >
          ${this._('Add custom search engine')}
        </span>
      </div>
      ${this._renderAddCustomEngineForm()}
    `
  }

  _renderLegend() {
    return html`
      <div class="legend">
        <span class="legend-item">
          ${renderIcon(mdiEarth, 'var(--grampsjs-body-font-color-60)')}
          <span>${this._('Open access')}</span>
        </span>
        <span class="legend-item">
          ${renderIcon(mdiShieldAccount, 'var(--grampsjs-body-font-color-60)')}
          <span>${this._('Registration required')}</span>
        </span>
        <span class="legend-item">
          ${renderIcon(mdiLock, 'var(--grampsjs-body-font-color-60)')}
          <span>${this._('Records require additional access')}</span>
        </span>
      </div>
    `
  }

  renderForm() {
    const searchWebUrls = this.getExternalSearchWebsitesData()
    const visibleWebUrls = this.editMode
      ? searchWebUrls
      : searchWebUrls.filter(web => !this.hiddenWebsites[web.key])

    return html`
      <div>
        ${this._renderHeader()} ${this._renderWebsiteList(visibleWebUrls)}
        ${this._renderAddCustomEngine()} ${this._renderLegend()}
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-form-external-search',
  GrampsjsFormExternalSearch
)
