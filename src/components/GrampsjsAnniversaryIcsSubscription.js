import {LitElement, css, html} from 'lit'
import {keyed} from 'lit/directives/keyed.js'

import '@material/web/button/outlined-button'
import '@material/web/button/filled-button'
import '@material/web/button/text-button'
import '@material/web/checkbox/checkbox'
import '@material/web/dialog/dialog'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'
import '@material/web/textfield/filled-text-field'
import {mdiCheck, mdiContentCopy} from '@mdi/js'

import {__APIHOST__} from '../api.js'
import {tagFilter} from '../filterDefinitions.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {fireEvent} from '../util.js'
import './GrampsjsFilterTags.js'
import './GrampsjsFilterChip.js'
import './GrampsjsFormSelectType.js'
import './GrampsjsIcon.js'

const TOKEN_SCOPE = 'anniversaries_ics'
const TOKEN_ENDPOINT = `/api/users/-/access-tokens/${TOKEN_SCOPE}/`
const EVENT_TYPES = ['Birth', 'Marriage', 'Death']
const FILTER_CATALOGS = {
  person: '/api/filters/people',
  event: '/api/filters/events',
  types: '/api/types/',
}

export class GrampsjsAnniversaryIcsSubscription extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        fieldset {
          border: 0;
          margin: 0 0 0.75rem;
          padding: 0;
        }

        legend {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
        }

        label {
          align-items: center;
          display: flex;
          gap: 0.5rem;
          margin: 0.35rem 0;
        }

        .event-type-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.5rem;
        }

        details {
          margin: 0.75rem 0;
        }

        .hint {
          margin: 0.25rem 0 0.75rem;
          font-size: 0.9rem;
        }

        .scope {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          margin: 0.5rem 0;
        }

        .scope md-text-button {
          margin: -8px 0;
        }

        summary {
          cursor: pointer;
          font-weight: 500;
        }

        .filter-block {
          margin: 1rem 0;
        }

        .filter-block h4 {
          margin-bottom: 0.5rem;
        }

        .status {
          color: var(--md-sys-color-on-surface-variant);
          max-width: 70ch;
        }

        .type-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 500px;
        }

        .type-picker grampsjs-form-select-type {
          flex: 1;
          min-width: 0;
        }

        .error {
          color: var(--md-sys-color-error);
          max-width: 70ch;
        }

        .actions {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        #anniversary-ics-url {
          width: min(100%, 720px);
        }
      `,
    ]
  }

  static get properties() {
    return {
      tokenStatus: {type: String},
      _url: {type: String},
      _loading: {type: Boolean},
      _copied: {type: Boolean},
      _errorMessage: {type: String},
      _eventTypes: {type: Array},
      _livingOnly: {type: Boolean},
      _primaryParticipantsOnly: {type: Boolean},
      _personFilter: {type: String},
      _eventFilter: {type: String},
      _personRules: {type: Array},
      _eventRules: {type: Array},
      _catalogs: {type: Object},
      _urlChanged: {type: Boolean},
      _optionsOpen: {type: Boolean},
      _additionalType: {type: String},
      _confirmRotation: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.tokenStatus = 'idle'
    this._url = ''
    this._loading = false
    this._copied = false
    this._errorMessage = ''
    this._eventTypes = ['Birth', 'Marriage']
    this._livingOnly = true
    this._primaryParticipantsOnly = true
    this._personFilter = ''
    this._eventFilter = ''
    this._personRules = []
    this._eventRules = []
    this._catalogs = Object.fromEntries(
      Object.keys(FILTER_CATALOGS).map(key => [
        key,
        {status: 'idle', filters: [], error: ''},
      ])
    )
    this._urlChanged = false
    this._optionsOpen = false
    this._additionalType = ''
    this._confirmRotation = false
    this._generation = 0
  }

  updated(changed) {
    if (
      changed.has('tokenStatus') &&
      this.tokenStatus === 'inactive' &&
      (this._url || this._loading || this._confirmRotation)
    ) {
      this.clearSession()
    }
    if (changed.has('appState')) this._refreshGeneratedUrl()
  }

  clearSession() {
    this._generation += 1
    clearTimeout(this._copyTimeout)
    this._url = ''
    this._loading = false
    this._copied = false
    this._urlChanged = false
    this._errorMessage = ''
    this._confirmRotation = false
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.clearSession()
  }

  get _wholeTree() {
    return !this._personFilter && this._personRules.length === 0
  }

  _scopeSummary() {
    if (this._wholeTree) return this._('Whole tree')
    return [
      this._personFilter,
      ...this._personRules.flatMap(rule => rule.values || []),
    ]
      .filter(Boolean)
      .join(', ')
  }

  render() {
    const validationMessage = this._validationMessage()
    const canGenerate =
      !this._loading &&
      !validationMessage &&
      (this.tokenStatus === 'active' || this.tokenStatus === 'inactive')
    return html`
      <p class="actions">
        ${!this._url || validationMessage
          ? html`<md-filled-button
              @click="${this._requestGenerateToken}"
              ?disabled="${!canGenerate}"
            >
              ${this.tokenStatus === 'active'
                ? this._('Regenerate link')
                : this._('Generate link')}
            </md-filled-button>`
          : ''}
      </p>
      ${validationMessage
        ? html`<p class="error" role="alert">${validationMessage}</p>`
        : ''}
      ${this._statusMessage()
        ? html` <p class="status" aria-live="polite">
            ${this._statusMessage()}
          </p>`
        : ''}
      ${this._url && !validationMessage
        ? html`
            <p>
              <md-filled-text-field
                id="anniversary-ics-url"
                type="url"
                label="${this._('Subscription URL')}"
                .value="${this._url}"
                readonly
                autocomplete="off"
              ></md-filled-text-field>
            </p>
            <p class="actions">
              <md-filled-button
                @click="${this._copyUrl}"
                ?disabled="${this._loading}"
              >
                <grampsjs-icon
                  slot="icon"
                  path="${this._copied ? mdiCheck : mdiContentCopy}"
                  color="var(--md-sys-color-on-primary)"
                ></grampsjs-icon>
                ${this._copied ? this._('Copied') : this._('Copy URL')}
              </md-filled-button>
              <md-text-button
                @click="${this._requestGenerateToken}"
                ?disabled="${!canGenerate}"
              >
                ${this._('Regenerate link')}
              </md-text-button>
            </p>
          `
        : ''}
      ${this._urlChanged && !validationMessage
        ? html`<p class="status" role="status">
            ${this._(
              'Settings changed. Copy the updated URL and replace the subscription in your calendar app.'
            )}
          </p>`
        : ''}
      ${this._url
        ? html`<p class="status">
            ${this._(
              'Keep this link private; full dates are shared with your calendar provider.'
            )}
          </p>`
        : ''}
      ${this._renderOptions()}
      ${this._errorMessage
        ? html`<p class="error" role="alert">${this._errorMessage}</p>`
        : ''}
      ${this._confirmRotation
        ? html`<md-dialog open @cancel="${this._cancelRegenerateToken}">
            <span slot="headline"
              >${this._('Regenerate subscription link?')}</span
            >
            <div slot="content">
              ${this._(
                'The old link will stop working. Replace it in every calendar app using this subscription.'
              )}
            </div>
            <div slot="actions">
              <md-text-button @click="${this._cancelRegenerateToken}">
                ${this._('Cancel')}
              </md-text-button>
              <md-text-button @click="${this._confirmRegenerateToken}">
                ${this._('Regenerate link')}
              </md-text-button>
            </div>
          </md-dialog>`
        : ''}
    `
  }

  _renderOptions() {
    return html`
      <details
        id="anniversary-options"
        .open="${this._optionsOpen}"
        @toggle="${this._handleOptionsToggle}"
      >
        <summary>${this._('Options')}</summary>
        ${this._optionsOpen
          ? html`
              <fieldset>
                <legend>${this._('Events')}</legend>
                <div class="event-type-options">
                  ${EVENT_TYPES.filter(
                    type => type !== 'Death' || !this._livingOnly
                  ).map(
                    type => html`
                      <label>
                        <md-checkbox
                          aria-label="${this._(type)}"
                          ?checked="${this._eventTypes.includes(type)}"
                          @change="${event =>
                            this._handleEventTypeChange(
                              type,
                              event.target.checked
                            )}"
                        ></md-checkbox>
                        ${this._(type)}
                      </label>
                    `
                  )}
                </div>
                ${this._livingOnly
                  ? html`<p class="status">
                      ${this._(
                        'Death anniversaries are excluded while Living people only is enabled. Turn it off to include them.'
                      )}
                    </p>`
                  : ''}
                ${this._renderSelectedOtherTypes()}
              </fieldset>

              <label>
                <md-checkbox
                  id="living-only"
                  aria-label="${this._('Living people only')}"
                  ?checked="${this._livingOnly}"
                  @change="${event =>
                    this._setOption('_livingOnly', event.target.checked)}"
                ></md-checkbox>
                ${this._('Living people only')}
              </label>

              <p class="scope status">
                <span>${this._('People')}: ${this._scopeSummary()}</span>
                ${!this._wholeTree
                  ? html` <md-text-button
                      aria-label="${this._('Use whole tree')}"
                      @click="${this._clearPersonFilters}"
                    >
                      ${this._('Whole tree')}
                    </md-text-button>`
                  : ''}
              </p>
              ${this._renderOptionFilters()}
            `
          : ''}
      </details>
    `
  }

  _renderOptionFilters() {
    const _ = string => this._(string)
    return html`
      <div class="filter-block">
        <h4>${this._('Person')}</h4>
        ${this._renderSavedFilter('person')}
        <h4>${this._('Tags')}</h4>
        <grampsjs-filter-tags
          .appState="${this.appState}"
          .section="${tagFilter(_)}"
          .rules="${this._personRules}"
          @filter-section:change="${event =>
            this._handleRulesChange('person', event)}"
        ></grampsjs-filter-tags>
      </div>
      <div class="filter-block">
        <h4>${this._('Event')}</h4>
        ${this._renderSavedFilter('event')}
        <h4>${this._('Tags')}</h4>
        <grampsjs-filter-tags
          .appState="${this.appState}"
          .section="${tagFilter(_)}"
          .rules="${this._eventRules}"
          @filter-section:change="${event =>
            this._handleRulesChange('event', event)}"
        ></grampsjs-filter-tags>
      </div>
      ${this._renderOtherTypes()}
      <label>
        <md-checkbox
          id="secondary-participants"
          aria-label="${this._('Include secondary participants')}"
          ?checked="${!this._primaryParticipantsOnly}"
          @change="${event =>
            this._setOption('_primaryParticipantsOnly', !event.target.checked)}"
        ></md-checkbox>
        ${this._('Include secondary participants')}
      </label>
    `
  }

  _renderSavedFilter(key) {
    const catalog = this._catalogs[key]
    const value = key === 'person' ? this._personFilter : this._eventFilter
    return html`
      <div>
        ${keyed(
          catalog.status,
          html`<md-filled-select
            label="${this._('Filter')}"
            .value="${value}"
            ?disabled="${catalog.status !== 'loaded'}"
            @change="${event => this._handleSavedFilterChange(key, event)}"
          >
            <md-select-option value="" ?selected="${!value}">
              ${this._('None')}
            </md-select-option>
            ${catalog.filters.map(
              filter => html`
                <md-select-option
                  value="${filter.name}"
                  ?selected="${filter.name === value}"
                >
                  ${filter.name}
                </md-select-option>
              `
            )}
          </md-filled-select>`
        )}
        ${this._renderCatalogStatus(key)}
      </div>
    `
  }

  _renderCatalogStatus(key) {
    const catalog = this._catalogs[key]
    return html`${catalog.status === 'loading'
      ? html`<p class="status">${this._('Loading...')}</p>`
      : ''}
    ${catalog.status === 'unavailable'
      ? html`
          <p class="error" role="alert">${this._('An error occurred')}</p>
          <md-outlined-button @click="${() => this._loadCatalog(key)}">
            ${this._('Retry')}
          </md-outlined-button>
        `
      : ''} `
  }

  _renderOtherTypes() {
    const catalog = this._catalogs.types
    const names = [
      ...(catalog.types?.default?.event_types || []),
      ...(catalog.types?.custom?.event_types || []),
    ]
    const available = [...new Set(names)].filter(
      type =>
        !type.includes(',') &&
        !this._eventTypes.includes(type) &&
        !EVENT_TYPES.includes(type)
    )
    return html` <div class="filter-block">
      <h4>${this._('Other event types')}</h4>
      ${this._renderCatalogStatus('types')}
      ${catalog.status === 'loaded' && available.length
        ? html` <div class="type-picker">
            <grampsjs-form-select-type
              noheading
              nocustom
              typeName="event_types"
              defaultValue=""
              label="${this._('Event Type')}"
              .appState="${this.appState}"
              .types="${catalog.types}"
              .allowedTypes="${available}"
              .value="${this._additionalType}"
              @formdata:changed="${event => {
                event.stopPropagation()
                this._additionalType = event.detail.data
              }}"
            ></grampsjs-form-select-type>
            <md-outlined-button
              ?disabled="${!available.includes(this._additionalType)}"
              @click="${this._addOtherType}"
              >${this._('Add')}</md-outlined-button
            >
          </div>`
        : ''}
      ${names.some(type => type.includes(','))
        ? html`<p class="status">
            ${this._(
              'Event types containing a comma cannot be included in subscription links.'
            )}
          </p>`
        : ''}
    </div>`
  }

  _renderSelectedOtherTypes() {
    return html`<div class="actions">
      ${this._eventTypes
        .filter(type => !EVENT_TYPES.includes(type))
        .map(
          type => html` <grampsjs-filter-chip
            .appState="${this.appState}"
            label="${this._(type)}"
            @filter-chip:clear="${() =>
              this._handleEventTypeChange(type, false)}"
          ></grampsjs-filter-chip>`
        )}
    </div>`
  }

  _addOtherType() {
    if (!this._additionalType || this._additionalType.includes(',')) return
    this._handleEventTypeChange(this._additionalType, true)
    this._additionalType = ''
  }

  _handleOptionsToggle(event) {
    this._optionsOpen = event.target.open
    if (this._optionsOpen) this._loadAdvancedCatalogs()
  }

  _loadAdvancedCatalogs() {
    for (const key of Object.keys(FILTER_CATALOGS)) {
      if (this._catalogs[key].status === 'idle') {
        this._loadCatalog(key)
      }
    }
  }

  async _loadCatalog(key) {
    if (this._catalogs[key].status === 'loading') return
    this._setCatalog(key, {status: 'loading', error: ''})
    try {
      const result = await this.appState.apiGet(FILTER_CATALOGS[key])
      if ('error' in result) throw new Error(result.error)
      if (key === 'types') {
        if (!Array.isArray(result.data?.default?.event_types)) {
          throw new Error(this._('Invalid filter response'))
        }
        this._setCatalog(key, {status: 'loaded', types: result.data, error: ''})
        return
      }
      if (!Array.isArray(result.data?.filters)) {
        throw new Error(this._('Invalid filter response'))
      }
      this._setCatalog(key, {
        status: 'loaded',
        filters: result.data.filters,
        error: '',
      })
    } catch (error) {
      this._setCatalog(key, {
        status: 'unavailable',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  _setCatalog(key, state) {
    this._catalogs = {
      ...this._catalogs,
      [key]: {...this._catalogs[key], ...state},
    }
  }

  _handleSavedFilterChange(key, event) {
    if (key === 'person') this._personFilter = event.target.value
    else this._eventFilter = event.target.value
    this._refreshGeneratedUrl()
  }

  _handleRulesChange(key, event) {
    event.stopPropagation()
    if (key === 'person') this._personRules = event.detail.rules
    else this._eventRules = event.detail.rules
    this._refreshGeneratedUrl()
  }

  _clearPersonFilters() {
    this._personFilter = ''
    this._personRules = []
    this._refreshGeneratedUrl()
  }

  _handleEventTypeChange(type, checked) {
    if (type === 'Death' && this._livingOnly) return
    this._eventTypes = checked
      ? [...new Set([...this._eventTypes, type])]
      : this._eventTypes.filter(current => current !== type)
    this._refreshGeneratedUrl()
  }

  _setOption(property, value) {
    this[property] = value
    if (property === '_livingOnly' && value) {
      this._eventTypes = this._eventTypes.filter(type => type !== 'Death')
    }
    this._refreshGeneratedUrl()
  }

  _validationMessage() {
    if (this._eventTypes.length === 0) {
      return this._('Select at least one event type.')
    }
    return ''
  }

  _statusMessage() {
    if (this._loading) return this._('Loading...')
    if (this._url) {
      return ''
    }
    if (this.tokenStatus === 'active') {
      return this._(
        'For security, subscription links are only shown when created. Regenerate the link if you no longer have it.'
      )
    }
    if (this.tokenStatus === 'inactive') {
      return ''
    }
    if (this.tokenStatus === 'unavailable') return ''
    return this._('Loading...')
  }

  _buildUrl(token, apiHost = __APIHOST__) {
    const url = new URL(
      `${apiHost.replace(/\/+$/, '')}/api/anniversaries.ics`,
      window.location.origin
    )
    url.searchParams.set('token', token)
    return this._applyUrlOptions(url).href
  }

  _applyUrlOptions(url) {
    const params = url.searchParams
    params.set('event_types', this._eventTypes.join(','))
    params.set('living_only', String(this._livingOnly))
    params.set(
      'primary_participants_only',
      String(this._primaryParticipantsOnly)
    )
    params.set('locale', this.appState?.i18n?.lang || 'en')
    this._setOptionalParam(params, 'person_filter', this._personFilter)
    this._setOptionalParam(params, 'filter', this._eventFilter)
    this._setRulesParam(params, 'person_rules', this._personRules)
    this._setRulesParam(params, 'rules', this._eventRules)
    return url
  }

  // eslint-disable-next-line class-methods-use-this
  _setOptionalParam(params, name, value) {
    if (value) params.set(name, value)
    else params.delete(name)
  }

  // eslint-disable-next-line class-methods-use-this
  _setRulesParam(params, name, rules) {
    if (rules.length) params.set(name, JSON.stringify({rules}))
    else params.delete(name)
  }

  _refreshGeneratedUrl() {
    if (!this._url) return
    const url = this._applyUrlOptions(new URL(this._url))
    if (url.href !== this._url) {
      this._url = url.href
      this._urlChanged = true
      this._copied = false
      clearTimeout(this._copyTimeout)
    }
  }

  _requestGenerateToken() {
    if (this._loading || this._validationMessage()) return
    if (this.tokenStatus === 'active') {
      this._confirmRotation = true
      return
    }
    return this._generateToken()
  }

  _cancelRegenerateToken() {
    this._confirmRotation = false
  }

  _confirmRegenerateToken() {
    this._cancelRegenerateToken()
    return this._generateToken()
  }

  async _generateToken() {
    if (
      this._loading ||
      this._validationMessage() ||
      (this.tokenStatus !== 'active' && this.tokenStatus !== 'inactive')
    ) {
      return
    }
    const previousStatus = this.tokenStatus
    const generation = ++this._generation
    this._loading = true
    this._url = ''
    this._urlChanged = false
    this._copied = false
    this._errorMessage = ''
    fireEvent(this, 'access-token:changed', {
      scope: TOKEN_SCOPE,
      status: 'loading',
    })
    try {
      const result = await this.appState.apiPost(
        TOKEN_ENDPOINT,
        {},
        {dbChanged: false}
      )
      if (generation !== this._generation) {
        fireEvent(this, 'access-token:refresh', {scope: TOKEN_SCOPE})
        return
      }
      if (
        'error' in result ||
        typeof result.data?.token !== 'string' ||
        !result.data.token
      ) {
        this._handleError(
          result.error || this._('No access token returned by server'),
          previousStatus
        )
        return
      }
      this._url = this._buildUrl(result.data.token)
      this._urlChanged = false
      this._loading = false
      fireEvent(this, 'access-token:changed', {
        scope: TOKEN_SCOPE,
        status: 'active',
      })
      fireEvent(this, 'grampsjs:notification', {
        message: this._('ICS subscription link updated'),
      })
    } catch (error) {
      if (generation !== this._generation) {
        fireEvent(this, 'access-token:refresh', {scope: TOKEN_SCOPE})
        return
      }
      this._handleError(
        error instanceof Error ? error.message : String(error),
        previousStatus
      )
    }
  }

  _handleError(message, tokenStatus) {
    this._errorMessage = message
    this._loading = false
    fireEvent(this, 'access-token:changed', {
      scope: TOKEN_SCOPE,
      status: tokenStatus,
    })
    fireEvent(this, 'grampsjs:error', {message})
  }

  async _copyUrl() {
    if (!this._url || this._loading || this._validationMessage()) return
    const url = this._url
    const generation = this._generation
    this._copied = false
    try {
      await navigator.clipboard.writeText(url)
      if (this._url !== url || generation !== this._generation) return
      clearTimeout(this._copyTimeout)
      this._copied = true
      this._urlChanged = false
      this._copyTimeout = setTimeout(() => {
        this._copied = false
      }, 2000)
    } catch {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Failed to copy ICS URL to clipboard'),
      })
    }
  }
}

window.customElements.define(
  'grampsjs-anniversary-ics-subscription',
  GrampsjsAnniversaryIcsSubscription
)
