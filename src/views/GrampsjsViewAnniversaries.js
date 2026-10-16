/*
Standalone calendar of recurring genealogical anniversaries.
*/

import {css, html} from 'lit'
import {
  mdiCalendarMonth,
  mdiChevronLeft,
  mdiChevronRight,
  mdiCog,
  mdiViewList,
} from '@mdi/js'

import '@material/web/button/outlined-button'
import '@material/web/button/text-button'
import '@material/web/checkbox/checkbox'
import '@material/web/dialog/dialog.js'
import '@material/web/iconbutton/icon-button'
import '@material/web/select/filled-select'
import '@material/web/select/select-option'
import '@material/web/textfield/filled-text-field'

import '../components/GrampsjsFilters.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPillToggle.js'
import '../components/GrampsjsTooltip.js'
import {tagFilter} from '../filterDefinitions.js'
import {apiVersionAtLeast, fireEvent} from '../util.js'
import {GrampsjsView} from './GrampsjsView.js'

const PAGE_SIZE = 100
const DEFAULT_EVENT_TYPES = ['Birth', 'Marriage', 'Death']

export function isoDate(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

export function monthRange(value = new Date()) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1)
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0)
  return {start: isoDate(start), end: isoDate(end)}
}

export function upcomingRange(value = new Date()) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const weekStart = new Date(start)
  weekStart.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 27)
  return {start: isoDate(start), end: isoDate(end)}
}

function dateFromIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  const result = new Date(year, month - 1, day)
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null
  }
  return result
}

function latestCalendarEnd(start) {
  const latest = new Date(
    start.getFullYear() + 5,
    start.getMonth(),
    start.getDate()
  )
  if (latest.getMonth() !== start.getMonth()) {
    latest.setDate(0)
  }
  return latest
}

export function rangeError(startValue, endValue) {
  const start = dateFromIso(startValue)
  const end = dateFromIso(endValue)
  if (!start || !end) return 'Enter a valid date range.'
  if (end < start) return 'The end date must not precede the start date.'
  if (end > latestCalendarEnd(start)) {
    return 'The date range must not exceed five years.'
  }
  return ''
}

function shiftMonth(value, amount) {
  const date = dateFromIso(value)
  if (!date) return null
  const year = date.getFullYear()
  const month = date.getMonth() + amount
  const day = Math.min(date.getDate(), new Date(year, month + 1, 0).getDate())
  return new Date(year, month, day)
}

export function calendarGridDates(startValue, endValue) {
  const start = dateFromIso(startValue)
  const end = dateFromIso(endValue)
  if (!start || !end || start > end) return []

  const weekOffset = (start.getDay() + 6) % 7
  const dates = []
  for (let dayOffset = -weekOffset; ; dayOffset += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + dayOffset)
    if (date > end) break
    dates.push(isoDate(date))
  }
  while (dates.length % 7) dates.push(null)
  return dates
}

function formatDate(value, locale) {
  const date = dateFromIso(value)
  return date
    ? new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    : value
}

export function formatRange(startValue, endValue, locale) {
  const start = dateFromIso(startValue)
  const end = dateFromIso(endValue)
  if (!start || !end) return ''
  const isFullMonth =
    start.getDate() === 1 &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    end.getDate() ===
      new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  if (isFullMonth) {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(start)
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function relativeDate(value, locale) {
  const occurrence = dateFromIso(value)
  if (!occurrence) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((occurrence - today) / 86400000)
  return new Intl.RelativeTimeFormat(locale, {numeric: 'auto'}).format(
    days,
    'day'
  )
}

function isMilestone(occurrence) {
  return occurrence.anniversary > 0 && occurrence.anniversary % 25 === 0
}

function typeOptions(canonical, localized) {
  const canonicalDefault = canonical?.data?.default?.event_types ?? []
  const canonicalCustom = canonical?.data?.custom?.event_types ?? []
  const localizedDefault = localized?.data?.default?.event_types ?? []
  const localizedCustom = localized?.data?.custom?.event_types ?? []
  const result = [
    ...canonicalDefault.map((value, index) => ({
      value,
      label: localizedDefault[index] ?? value,
    })),
    ...canonicalCustom.map((value, index) => ({
      value,
      label: localizedCustom[index] ?? value,
    })),
  ]
  return result.filter(
    ({value}, index) =>
      result.findIndex(option => option.value === value) === index
  )
}

export function partitionTypeOptions(options, selected) {
  return {
    visible: options.filter(
      ({value}) =>
        DEFAULT_EVENT_TYPES.includes(value) || selected.includes(value)
    ),
    available: options.filter(
      ({value}) =>
        !DEFAULT_EVENT_TYPES.includes(value) && !selected.includes(value)
    ),
  }
}

export class GrampsjsViewAnniversaries extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          padding-bottom: 32px;
        }

        .page-header,
        .page-actions,
        .period-navigation,
        .range-fields,
        .type-options,
        .actions,
        .occurrence-meta {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .page-header {
          justify-content: space-between;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0;
        }

        .page-actions {
          gap: 6px;
        }

        .period-navigation {
          background: var(--md-sys-color-surface-container-low);
          border-radius: 12px;
          display: grid;
          grid-template-columns: auto minmax(180px, 1fr) auto;
          margin-bottom: 14px;
          padding: 4px 8px;
        }

        .period-label {
          font-size: 1.05rem;
          font-weight: 500;
          text-align: center;
        }

        .range-fields {
          align-items: start;
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
        }

        .type-options {
          align-items: center;
          gap: 10px 18px;
        }

        .type-options label,
        .option-label {
          align-items: center;
          display: inline-flex;
          gap: 4px;
        }

        .type-heading {
          flex-basis: 100%;
          font-weight: 500;
        }

        .type-picker {
          max-width: 360px;
          min-width: 260px;
        }

        .settings-dialog {
          --md-dialog-container-max-inline-size: min(760px, calc(100vw - 32px));
          --md-dialog-container-min-inline-size: min(680px, calc(100vw - 32px));
        }

        .settings-content {
          display: grid;
          gap: 22px;
          max-height: min(70vh, 720px);
        }

        .settings-section {
          display: grid;
          gap: 12px;
        }

        .settings-section + .settings-section {
          border-top: 1px solid var(--md-sys-color-outline-variant);
          padding-top: 20px;
        }

        .settings-section h3 {
          font-size: 1rem;
          margin: 0;
        }

        .settings-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 24px;
        }

        details {
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 12px;
          padding: 12px;
        }

        summary {
          cursor: pointer;
          font-weight: 500;
        }

        .filter-block {
          margin: 18px 0;
        }

        .filter-grid {
          display: grid;
          gap: 0 24px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        @media (max-width: 640px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
        }

        .filter-block h3 {
          font-size: 1rem;
          margin-bottom: 8px;
        }

        .status {
          color: var(--md-sys-color-on-surface-variant);
        }

        .error {
          color: var(--md-sys-color-error);
        }

        .anniversary-list {
          display: grid;
          gap: 10px;
          list-style: none;
          margin: 18px 0;
          padding: 0;
        }

        .anniversary-card {
          background: var(--md-sys-color-surface-container-low);
          border-radius: 12px;
          display: grid;
          gap: 8px;
          grid-template-columns: minmax(105px, 0.25fr) minmax(0, 1fr) auto;
          padding: 14px 16px;
        }

        .anniversary-card.milestone {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 7%,
            var(--md-sys-color-surface-container-low)
          );
        }

        .occurrence-date {
          color: var(--md-sys-color-primary);
          font-weight: 500;
        }

        .summary {
          font-size: 1.05rem;
          font-weight: 500;
        }

        .participant,
        .event-link {
          background: none;
          border: 0;
          color: var(--md-sys-color-primary);
          cursor: pointer;
          font: inherit;
          padding: 0;
          text-align: left;
          text-decoration: underline;
          text-decoration-color: transparent;
          text-underline-offset: 2px;
        }

        .participant:hover,
        .participant:focus-visible,
        .event-link:hover,
        .event-link:focus-visible {
          text-decoration-color: currentColor;
        }

        .participants {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
        }

        .years {
          align-self: center;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .month-section {
          margin-top: 24px;
          overflow-x: auto;
        }

        .month-grid {
          border-left: 1px solid var(--md-sys-color-outline-variant);
          border-top: 1px solid var(--md-sys-color-outline-variant);
          display: grid;
          grid-template-columns: repeat(7, minmax(110px, 1fr));
          min-width: 770px;
        }

        .weekday,
        .day {
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          border-right: 1px solid var(--md-sys-color-outline-variant);
          min-height: 92px;
          padding: 7px;
        }

        .weekday {
          background: var(--md-sys-color-surface-container-low);
          min-height: auto;
          font-weight: 500;
        }

        .day-number {
          color: var(--md-sys-color-on-surface-variant);
        }

        .day.today {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 8%,
            transparent
          );
        }

        .day.today .day-number {
          color: var(--md-sys-color-primary);
          font-weight: 600;
        }

        .day.outside-range .day-number {
          opacity: 0.55;
        }

        .month-marker {
          color: var(--md-sys-color-on-surface-variant);
          font-size: 0.72rem;
          margin-left: 5px;
          text-transform: uppercase;
        }

        .calendar-event {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 10%,
            transparent
          );
          border: 0;
          border-radius: 5px;
          color: var(--md-sys-color-on-surface);
          cursor: pointer;
          display: block;
          font: inherit;
          font-size: 0.78rem;
          margin-top: 4px;
          overflow: hidden;
          padding: 3px 5px;
          text-align: left;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }

        @media (max-width: 700px) {
          .page-header {
            align-items: flex-start;
          }

          .page-actions {
            justify-content: flex-end;
          }

          .anniversary-card {
            grid-template-columns: 1fr;
          }

          .years {
            justify-self: start;
          }

          .range-fields {
            grid-template-columns: 1fr;
          }

          .settings-dialog {
            --md-dialog-container-min-inline-size: calc(100vw - 24px);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      ...super.properties,
      _data: {type: Array},
      _end: {type: String},
      _error: {type: String},
      _eventTypes: {type: Array},
      _eventRules: {type: Array},
      _loaded: {type: Boolean},
      _loading: {type: Boolean},
      _livingOnly: {type: Boolean},
      _mode: {type: String},
      _page: {type: Number},
      _personRules: {type: Array},
      _primaryOnly: {type: Boolean},
      _settingsOpen: {type: Boolean},
      _start: {type: String},
      _total: {type: Number},
      _typeOptions: {type: Array},
      _typesStatus: {type: String},
      _wholeTree: {type: Boolean},
    }
  }

  constructor() {
    super()
    const range = upcomingRange()
    this._data = []
    this._end = range.end
    this._error = ''
    this._eventTypes = [...DEFAULT_EVENT_TYPES]
    this._eventRules = []
    this._loaded = false
    this._loading = false
    this._livingOnly = true
    this._mode = 'list'
    this._page = 1
    this._personRules = []
    this._primaryOnly = true
    this._settingsOpen = false
    this._start = range.start
    this._total = 0
    this._typeOptions = DEFAULT_EVENT_TYPES.map(value => ({
      value,
      label: value,
    }))
    this._typesStatus = 'idle'
    this._wholeTree = true
    this._requestId = 0
  }

  updated(changed) {
    super.updated(changed)
    if (this.active && !this._loaded && this._supportsAnniversaries()) {
      this._loaded = true
      this._loadTypes()
      this._load()
    }
  }

  _onLangChanged() {
    if (this._loaded) {
      this._loadTypes()
      this._load()
    }
  }

  _supportsAnniversaries() {
    return apiVersionAtLeast(this.appState?.dbInfo, 3, 23)
  }

  async _loadTypes() {
    if (this._typesStatus === 'loading') return
    this._typesStatus = 'loading'
    const [canonical, localized] = await Promise.allSettled([
      this.appState.apiGet('/api/types/'),
      this.appState.apiGet('/api/types/?locale=true'),
    ])
    const canonicalResult =
      canonical.status === 'fulfilled' ? canonical.value : {error: ''}
    const localizedResult =
      localized.status === 'fulfilled' ? localized.value : {error: ''}
    const options = typeOptions(canonicalResult, localizedResult)
    if (options.length) {
      this._typeOptions = options
      this._typesStatus = 'loaded'
    } else {
      this._typesStatus = 'unavailable'
    }
  }

  _validationMessage() {
    const dateError = rangeError(this._start, this._end)
    if (dateError) return this._(dateError)
    if (!this._eventTypes.length) {
      return this._('Select at least one event type.')
    }
    if (!this._wholeTree && !this._personRules.length) {
      return this._('Select a Person filter or include the Whole tree.')
    }
    return ''
  }

  _queryUrl(page = 1) {
    const params = new URLSearchParams({
      start: this._queryStart(),
      end: this._end,
      event_types: this._eventTypes.join(','),
      living_only: String(this._livingOnly),
      primary_participants_only: String(this._primaryOnly),
      locale: this.appState.i18n.lang || 'en',
      page: String(page),
      pagesize: String(PAGE_SIZE),
    })
    if (this._personRules.length) {
      params.set('person_rules', JSON.stringify({rules: this._personRules}))
    }
    if (this._eventRules.length) {
      params.set('rules', JSON.stringify({rules: this._eventRules}))
    }
    return `/api/anniversaries/?${params}`
  }

  _queryStart() {
    const start = dateFromIso(this._start)
    if (this._mode !== 'grid' || !start) return this._start
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    return isoDate(start)
  }

  async _load(append = false) {
    const validationMessage = this._validationMessage()
    if (validationMessage) {
      this._error = validationMessage
      if (!append) {
        this._data = []
        this._total = 0
      }
      return false
    }
    const page = append ? this._page + 1 : 1
    const requestId = ++this._requestId
    this._loading = true
    this._error = ''
    let result
    try {
      result = await this.appState.apiGet(this._queryUrl(page))
    } catch (error) {
      result = {
        error:
          error instanceof Error
            ? error.message
            : this._('Unable to load anniversaries.'),
      }
    }
    if (requestId !== this._requestId) return false
    this._loading = false
    if ('error' in result) {
      this._error = result.error || this._('Unable to load anniversaries.')
      return false
    }
    const occurrences = Array.isArray(result.data) ? result.data : []
    this._page = page
    this._data = append ? [...this._data, ...occurrences] : occurrences
    this._total = Number(result.total_count ?? this._data.length)
    return true
  }

  async _loadRemaining() {
    while (this._data.length < this._total) {
      const previousLength = this._data.length
      if (!(await this._load(true)) || this._data.length === previousLength) {
        break
      }
    }
  }

  async _setMode(mode) {
    if (mode === this._mode) return
    this._mode = mode
    if ((await this._load()) && mode === 'grid') await this._loadRemaining()
  }

  _setMonth(offset) {
    const start = shiftMonth(this._start, offset)
    const end = shiftMonth(this._end, offset)
    if (!start || !end) return
    this._start = isoDate(start)
    this._end = isoDate(end)
    this._load()
  }

  _handleRangeChange(event, property) {
    this[property] = event.target.value
    this._load()
  }

  _openSettings() {
    this._settingsOpen = true
  }

  _closeSettings() {
    this._settingsOpen = false
  }

  _toggleType(type, checked) {
    this._eventTypes = checked
      ? [...new Set([...this._eventTypes, type])]
      : this._eventTypes.filter(current => current !== type)
    this._load()
  }

  _addType(event) {
    const type = event.target.value
    if (!type) return
    event.target.value = ''
    this._toggleType(type, true)
  }

  _navigateParticipant(participant) {
    fireEvent(this, 'nav', {
      path: `${participant.object_type}/${participant.gramps_id}`,
    })
  }

  _navigateEvent(occurrence) {
    if (!occurrence.event?.gramps_id) return
    fireEvent(this, 'nav', {
      path: `event/${occurrence.event.gramps_id}`,
    })
  }

  _renderViewButtons() {
    return html`
      <grampsjs-pill-toggle
        .options="${[
          {value: 'list', label: this._('List view'), icon: mdiViewList},
          {
            value: 'grid',
            label: this._('Calendar view'),
            icon: mdiCalendarMonth,
          },
        ]}"
        .selected="${this._mode}"
        .appState="${this.appState}"
        .ariaLabel="${this._('View')}"
        @pill-toggle:change="${event => this._setMode(event.detail.value)}"
      ></grampsjs-pill-toggle>
    `
  }

  _renderTypeOptions(showHeading = true) {
    const {visible: visibleOptions, available: availableOptions} =
      partitionTypeOptions(this._typeOptions, this._eventTypes)
    return html`
      <div class="type-options">
        ${showHeading
          ? html`<span class="type-heading">${this._('Event types')}</span>`
          : ''}
        ${visibleOptions.map(
          ({value, label}) => html`
            <label>
              <md-checkbox
                aria-label="${label}"
                ?checked="${this._eventTypes.includes(value)}"
                @change="${event =>
                  this._toggleType(value, event.target.checked)}"
              ></md-checkbox>
              ${label}
            </label>
          `
        )}
        ${availableOptions.length
          ? html`
              <md-filled-select
                class="type-picker"
                label="${this._('Add another event type')}"
                @change="${this._addType}"
              >
                <md-select-option value="" selected></md-select-option>
                ${availableOptions.map(
                  ({value, label}) => html`
                    <md-select-option value="${value}">
                      ${label}
                    </md-select-option>
                  `
                )}
              </md-filled-select>
            `
          : ''}
        ${this._typesStatus === 'unavailable'
          ? html`
              <span class="error"
                >${this._('Could not load event types.')}</span
              >
              <md-outlined-button @click="${this._loadTypes}">
                ${this._('Retry')}
              </md-outlined-button>
            `
          : ''}
      </div>
    `
  }

  _renderAdvancedFilters() {
    const _ = string => this._(string)
    return html`
      <details>
        <summary>${this._('Advanced filters')}</summary>
        <div class="filter-grid">
          <div class="filter-block">
            <h3>${this._('Person filters')}</h3>
            <grampsjs-filters
              .appState="${this.appState}"
              .definitions="${[tagFilter(_)]}"
              .showGql="${false}"
              @filters:changed="${event => {
                this._personRules = event.detail.filters
                this._load()
              }}"
            ></grampsjs-filters>
          </div>
          <div class="filter-block">
            <h3>${this._('Event filters')}</h3>
            <grampsjs-filters
              .appState="${this.appState}"
              .definitions="${[tagFilter(_)]}"
              .showGql="${false}"
              @filters:changed="${event => {
                this._eventRules = event.detail.filters
                this._load()
              }}"
            ></grampsjs-filters>
          </div>
        </div>
        <label class="option-label">
          <md-checkbox
            ?checked="${!this._primaryOnly}"
            @change="${event => {
              this._primaryOnly = !event.target.checked
              this._load()
            }}"
          ></md-checkbox>
          ${this._('Include secondary participants')}
        </label>
      </details>
    `
  }

  _renderSettingsDialog() {
    const validationMessage = this._validationMessage()
    return html`
      <md-dialog
        class="settings-dialog"
        ?open="${this._settingsOpen}"
        @cancel="${this._closeSettings}"
        @close="${this._closeSettings}"
      >
        <div slot="headline">${this._('Preferences')}</div>
        <div slot="content" class="settings-content">
          <section class="settings-section">
            <h3>${this._('Date range')}</h3>
            <div class="range-fields">
              <md-filled-text-field
                type="date"
                label="${this._('Start date')}"
                .value="${this._start}"
                @change="${event => this._handleRangeChange(event, '_start')}"
              ></md-filled-text-field>
              <md-filled-text-field
                type="date"
                label="${this._('End date')}"
                .value="${this._end}"
                @change="${event => this._handleRangeChange(event, '_end')}"
              ></md-filled-text-field>
            </div>
          </section>

          <section class="settings-section">
            <h3>${this._('Event types')}</h3>
            ${this._renderTypeOptions(false)}
          </section>

          <section class="settings-section settings-options">
            <label class="option-label">
              <md-checkbox
                ?checked="${this._livingOnly}"
                @change="${event => {
                  this._livingOnly = event.target.checked
                  this._load()
                }}"
              ></md-checkbox>
              ${this._('Living people only')}
            </label>
            <label class="option-label">
              <md-checkbox
                ?checked="${this._wholeTree}"
                @change="${event => {
                  this._wholeTree = event.target.checked
                  this._load()
                }}"
              ></md-checkbox>
              ${this._('Whole tree')}
            </label>
          </section>

          <section class="settings-section">
            ${this._renderAdvancedFilters()}
          </section>

          ${validationMessage
            ? html`<p class="error" role="alert">${validationMessage}</p>`
            : ''}
        </div>
        <div slot="actions">
          <md-text-button @click="${this._closeSettings}">
            ${this._('Close')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _renderParticipant(participant) {
    return html`
      <button
        type="button"
        class="participant"
        @click="${() => this._navigateParticipant(participant)}"
      >
        ${participant.name}
      </button>
    `
  }

  _renderList() {
    const locale = this.appState.i18n.lang || 'en'
    return html`
      <ul class="anniversary-list">
        ${this._data.map(
          occurrence => html`
            <li
              class="anniversary-card ${isMilestone(occurrence)
                ? 'milestone'
                : ''}"
            >
              <div>
                <div class="occurrence-date">
                  ${formatDate(occurrence.occurrence_date, locale)}
                </div>
                <div class="status">
                  ${relativeDate(occurrence.occurrence_date, locale)}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  class="event-link summary"
                  @click="${() => this._navigateEvent(occurrence)}"
                >
                  ${occurrence.type}
                </button>
                <div class="participants">
                  ${occurrence.participants.map(participant =>
                    this._renderParticipant(participant)
                  )}
                </div>
                <div class="occurrence-meta status">
                  <span>
                    ${this._('Original date')}:
                    ${occurrence.event_date ||
                    formatDate(occurrence.historical_date, locale)}
                  </span>
                </div>
              </div>
              <div class="years">
                ${occurrence.anniversary} ${this._('years')}
              </div>
            </li>
          `
        )}
      </ul>
    `
  }

  _renderGrid() {
    const dates = calendarGridDates(this._start, this._end)
    if (!dates.length) return ''
    const eventsByDate = new Map()
    for (const occurrence of this._data) {
      const date = occurrence.occurrence_date
      eventsByDate.set(date, [...(eventsByDate.get(date) ?? []), occurrence])
    }
    const locale = this.appState.i18n.lang || 'en'
    const weekdays = Array.from({length: 7}, (_, index) =>
      new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(
        new Date(2024, 0, index + 1)
      )
    )
    return html`
      <section class="month-section">
        <div class="month-grid">
          ${weekdays.map(day => html`<div class="weekday">${day}</div>`)}
          ${dates.map((date, index) => {
            if (!date) return html`<div class="day"></div>`
            const currentDate = dateFromIso(date)
            const monthMarker =
              index === 0 || date === this._start || currentDate.getDate() === 1
                ? new Intl.DateTimeFormat(locale, {month: 'short'}).format(
                    currentDate
                  )
                : ''
            const today = date === isoDate(new Date())
            const outsideRange = date < this._start
            return html`
              <div
                class="day ${today ? 'today' : ''} ${outsideRange
                  ? 'outside-range'
                  : ''}"
              >
                <div class="day-number">
                  <time datetime="${date}">${currentDate.getDate()}</time>
                  ${monthMarker
                    ? html`<span class="month-marker">${monthMarker}</span>`
                    : ''}
                </div>
                ${(eventsByDate.get(date) ?? []).map(
                  occurrence => html`
                    <button
                      type="button"
                      class="calendar-event"
                      title="${occurrence.summary}"
                      @click="${() => this._navigateEvent(occurrence)}"
                    >
                      ${occurrence.summary} (${occurrence.anniversary})
                    </button>
                  `
                )}
              </div>
            `
          })}
        </div>
      </section>
    `
  }

  renderContent() {
    if (!this._supportsAnniversaries()) return ''
    const validationMessage = this._validationMessage()
    const locale = this.appState.i18n.lang || 'en'
    return html`
      <div class="page-header">
        <h1>${this._('Anniversaries')}</h1>
        <div class="page-actions">
          ${this._renderViewButtons()}
          <md-icon-button
            id="anniversary-settings"
            aria-label="${this._('Preferences')}"
            @click="${this._openSettings}"
          >
            <grampsjs-icon path="${mdiCog}"></grampsjs-icon>
          </md-icon-button>
          <grampsjs-tooltip
            for="anniversary-settings"
            .appState="${this.appState}"
          >
            ${this._('Preferences')}
          </grampsjs-tooltip>
        </div>
      </div>

      <div class="period-navigation">
        <md-icon-button
          aria-label="${this._('Previous month')}"
          @click="${() => this._setMonth(-1)}"
        >
          <grampsjs-icon path="${mdiChevronLeft}"></grampsjs-icon>
        </md-icon-button>
        <div class="period-label">
          ${formatRange(this._start, this._end, locale)}
        </div>
        <md-icon-button
          aria-label="${this._('Next month')}"
          @click="${() => this._setMonth(1)}"
        >
          <grampsjs-icon path="${mdiChevronRight}"></grampsjs-icon>
        </md-icon-button>
      </div>

      ${this._renderSettingsDialog()}
      ${validationMessage
        ? html`<p class="error" role="alert">${validationMessage}</p>`
        : ''}
      ${this._loading
        ? html`<p class="status" aria-live="polite">${this._('Loading...')}</p>`
        : ''}
      ${this._error
        ? html`<p class="error" role="alert">${this._error}</p>`
        : ''}
      ${!this._loading && !this._error && !this._data.length
        ? html`<p class="status">${this._('No anniversaries found.')}</p>`
        : ''}
      ${this._data.length
        ? this._mode === 'list'
          ? this._renderList()
          : this._renderGrid()
        : ''}
      ${this._data.length < this._total
        ? html`
            <p class="status">
              ${this._('Showing %s of %s', this._data.length, this._total)}
            </p>
            <md-outlined-button
              @click="${() => this._load(true)}"
              ?disabled="${this._loading}"
            >
              ${this._('Load more')}
            </md-outlined-button>
          `
        : ''}
    `
  }
}

window.customElements.define(
  'grampsjs-view-anniversaries',
  GrampsjsViewAnniversaries
)
