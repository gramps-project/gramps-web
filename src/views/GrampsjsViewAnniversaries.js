/*
Standalone calendar of recurring genealogical anniversaries.
*/

import {css, html} from 'lit'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiFilter,
  mdiViewGrid,
  mdiViewList,
} from '@mdi/js'

import '@material/web/button/outlined-button.js'
import '@material/web/checkbox/checkbox.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/switch/switch.js'
import '@material/web/textfield/filled-text-field.js'

import '../components/GrampsjsFormSelectObject.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPillToggle.js'
import {fireEvent, apiVersionAtLeast} from '../util.js'
import {GrampsjsView} from './GrampsjsView.js'

const PAGE_SIZE = 100
const MAX_RANGE_DAYS = 5 * 366

function isoDate(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

function monthRange(value = new Date()) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1)
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0)
  return {start: isoDate(start), end: isoDate(end)}
}

function addMonths(value, amount) {
  const [year, month] = value.split('-').map(Number)
  return monthRange(new Date(year, month - 1 + amount, 1))
}

function dateParts(value) {
  return value.split('-').map(Number)
}

function rangeError(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return 'Enter a valid date range.'
  }
  if (end < start) return 'The end date must not precede the start date.'
  const [startYear, startMonth, startDay] = dateParts(start)
  const [endYear, endMonth, endDay] = dateParts(end)
  const days =
    (Date.UTC(endYear, endMonth - 1, endDay) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
    86400000
  if (days > MAX_RANGE_DAYS) return 'The date range must not exceed five years.'
  return ''
}

function formatDate(value, locale) {
  const [year, month, day] = dateParts(value)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function daysUntil(value) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [year, month, day] = dateParts(value)
  return Math.round((new Date(year, month - 1, day) - today) / 86400000)
}

function isMilestone(occurrence) {
  return occurrence.anniversary > 0 && occurrence.anniversary % 25 === 0
}

function combineRules(rules, tag) {
  if (!tag) return rules
  const tagRule = {name: 'HasTag', values: [tag]}
  if (!rules) return JSON.stringify({rules: [tagRule]})
  try {
    return JSON.stringify({
      function: 'and',
      rules: [JSON.parse(rules), tagRule],
    })
  } catch {
    return rules
  }
}

function filterName(filter) {
  return typeof filter === 'string' ? filter : filter?.name || ''
}

export class GrampsjsViewAnniversaries extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .header,
        .range,
        .toolbar,
        .options,
        .advanced-grid {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header {
          justify-content: space-between;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
        }

        .range md-filled-text-field {
          max-width: 190px;
        }

        .toolbar {
          justify-content: space-between;
          margin: 16px 0;
        }

        .types {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
        }

        .types label,
        .option-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        details {
          margin: 18px 0;
          padding: 12px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
        }

        summary {
          cursor: pointer;
          font-weight: 500;
        }

        .advanced-grid > * {
          flex: 1 1 230px;
        }

        .advanced-grid md-filled-text-field {
          width: 100%;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          text-align: left;
          vertical-align: top;
        }

        .participant {
          color: var(--md-sys-color-primary);
          cursor: pointer;
        }

        .milestone {
          display: inline-block;
          padding: 1px 6px;
          border: 1px solid var(--md-sys-color-primary);
          border-radius: 999px;
          color: var(--md-sys-color-primary);
          font-size: 0.8em;
        }

        .month-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          border-top: 1px solid var(--md-sys-color-outline-variant);
          border-left: 1px solid var(--md-sys-color-outline-variant);
        }

        .weekday,
        .day {
          min-height: 88px;
          padding: 6px;
          border-right: 1px solid var(--md-sys-color-outline-variant);
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .weekday {
          min-height: auto;
          font-weight: 500;
        }

        .day-number {
          color: var(--grampsjs-body-font-color-50);
        }

        .event {
          display: block;
          margin-top: 4px;
          padding: 2px 4px;
          border-radius: 4px;
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 10%,
            transparent
          );
          font-size: 0.8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status {
          color: var(--grampsjs-body-font-color-50);
        }

        .error {
          color: var(--md-sys-color-error);
        }

        @media (max-width: 700px) {
          :host {
            margin: 20px;
          }

          table thead {
            display: none;
          }

          table,
          tbody,
          tr,
          td {
            display: block;
          }

          td {
            border-bottom: 0;
            padding: 3px 0;
          }

          tr {
            padding: 10px 0;
            border-bottom: 1px solid var(--md-sys-color-outline-variant);
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
      _loaded: {type: Boolean},
      _loading: {type: Boolean},
      _mode: {type: String},
      _page: {type: Number},
      _start: {type: String},
      _total: {type: Number},
      _types: {type: Array},
      _livingOnly: {type: Boolean},
      _primaryOnly: {type: Boolean},
      _anchor: {type: Object},
      _relationshipDepth: {type: Number},
      _personFilter: {type: String},
      _eventFilter: {type: String},
      _personRules: {type: String},
      _eventRules: {type: String},
      _personTag: {type: String},
      _eventTag: {type: String},
      _tags: {type: Array},
      _filters: {type: Object},
    }
  }

  constructor() {
    super()
    const range = monthRange()
    this._data = []
    this._end = range.end
    this._error = ''
    this._eventTypes = ['Birth', 'Marriage', 'Death']
    this._filters = {person: [], event: []}
    this._loaded = false
    this._loading = false
    this._mode = 'list'
    this._page = 1
    this._start = range.start
    this._total = 0
    this._types = ['Birth', 'Marriage', 'Death']
    this._livingOnly = true
    this._primaryOnly = true
    this._anchor = null
    this._relationshipDepth = 2
    this._personFilter = ''
    this._eventFilter = ''
    this._personRules = ''
    this._eventRules = ''
    this._personTag = ''
    this._eventTag = ''
    this._tags = []
  }

  updated(changed) {
    super.updated(changed)
    if (this.active && !this._loaded && this._supportsAnniversaries()) {
      this._loaded = true
      this._loadOptions()
      this._load()
    }
  }

  _supportsAnniversaries() {
    return apiVersionAtLeast(this.appState?.dbInfo, 3, 23)
  }

  async _loadOptions() {
    const locale = this.appState.i18n.lang || 'en'
    const results = await Promise.allSettled([
      this.appState.apiGet('/api/types/?locale=true'),
      this.appState.apiGet(`/api/tags/?locale=${locale}&pagesize=500`),
      this.appState.apiGet('/api/filters/Person'),
      this.appState.apiGet('/api/filters/Event'),
    ])
    const [types, tags, personFilters, eventFilters] = results.map(result =>
      result.status === 'fulfilled' ? result.value : {}
    )
    if ('data' in types) {
      this._types = [
        ...(types.data.default?.event_types ?? []),
        ...(types.data.custom?.event_types ?? []),
      ]
    }
    if ('data' in tags) this._tags = tags.data
    this._filters = {
      person: 'data' in personFilters ? personFilters.data : [],
      event: 'data' in eventFilters ? eventFilters.data : [],
    }
  }

  _queryUrl(page = 1) {
    const params = new URLSearchParams({
      start: this._start,
      end: this._end,
      event_types: this._eventTypes.join(','),
      living_only: String(this._livingOnly),
      primary_participants_only: String(this._primaryOnly),
      relationship_depth: String(this._relationshipDepth),
      locale: this.appState.i18n.lang || 'en',
      page: String(page),
      pagesize: String(PAGE_SIZE),
    })
    if (this._anchor?.object?.gramps_id) {
      params.set('anchor_gramps_id', this._anchor.object.gramps_id)
    }
    if (this._personFilter) params.set('person_filter', this._personFilter)
    if (this._eventFilter) params.set('event_filter', this._eventFilter)
    const personRules = combineRules(this._personRules, this._personTag)
    const eventRules = combineRules(this._eventRules, this._eventTag)
    if (personRules) params.set('person_rules', personRules)
    if (eventRules) params.set('event_rules', eventRules)
    return `/api/anniversaries/?${params}`
  }

  async _load(append = false) {
    const validationError = rangeError(this._start, this._end)
    if (validationError) {
      this._error = this._(validationError)
      this._data = []
      this._total = 0
      return
    }
    if (!this._eventTypes.length) {
      this._data = []
      this._total = 0
      this._error = this._('Select at least one event type.')
      return
    }
    this._loading = true
    this._error = ''
    const page = append ? this._page + 1 : 1
    let result
    try {
      result = await this.appState.apiGet(this._queryUrl(page))
    } catch {
      result = {error: this._('Unable to load anniversaries.')}
    }
    this._loading = false
    if ('error' in result) {
      this._error = result.error
      return
    }
    this._page = page
    this._data = append ? [...this._data, ...result.data] : result.data
    this._total = Number(result.total_count ?? this._data.length)
  }

  _setMonth(offset) {
    const range = addMonths(this._start, offset)
    this._start = range.start
    this._end = range.end
    this._load()
  }

  _handleRangeChange(event, key) {
    this[key] = event.target.value
  }

  _applyRange() {
    this._load()
  }

  _toggleType(event) {
    const {value, checked} = event.target
    this._eventTypes = checked
      ? [...this._eventTypes, value]
      : this._eventTypes.filter(type => type !== value)
    this._load()
  }

  _handleAnchor({detail: {objects}}) {
    this._anchor = objects?.[0] ?? null
    this._load()
  }

  _clearAnchor() {
    this.renderRoot.querySelector('#anniversaries-anchor')?.reset()
    this._anchor = null
    this._load()
  }

  _navigate(participant) {
    fireEvent(this, 'nav', {
      path: `${participant.object_type}/${participant.gramps_id}`,
    })
  }

  _renderViewButtons() {
    const options = [
      {value: 'list', label: this._('List view'), icon: mdiViewList},
      {value: 'grid', label: this._('Calendar view'), icon: mdiViewGrid},
    ]
    return html`<grampsjs-pill-toggle
      .options="${options}"
      .selected="${this._mode}"
      .appState="${this.appState}"
      .ariaLabel="${this._('View')}"
      @pill-toggle:change="${event => {
        this._mode = event.detail.value
      }}"
    >
    </grampsjs-pill-toggle>`
  }

  _renderParticipant(participant) {
    return html`<span
      class="participant"
      role="link"
      tabindex="0"
      @click="${() => this._navigate(participant)}"
      @keydown="${event => {
        if (event.key === 'Enter' || event.key === ' ')
          this._navigate(participant)
      }}"
      >${participant.name}</span
    >`
  }

  _relativeDayLabel(value) {
    const remaining = daysUntil(value)
    if (remaining === 0) return this._('Today')
    if (remaining < 0) return `${-remaining} ${this._('days ago')}`
    return `${this._('in')} ${remaining} ${this._('days')}`
  }

  _renderList() {
    const locale = this.appState.i18n.lang || 'en'
    return html`
      <table>
        <thead>
          <tr>
            <th>${this._('Type')}</th>
            <th>${this._('Person')}</th>
            <th>${this._('Original date')}</th>
            <th>${this._('Occurrence date')}</th>
            <th>${this._('When')}</th>
            <th>${this._('Years')}</th>
          </tr>
        </thead>
        <tbody>
          ${this._data.map(
            occurrence => html`
              <tr>
                <td>${occurrence.type}</td>
                <td>
                  ${occurrence.participants.map(p =>
                    this._renderParticipant(p)
                  )}
                </td>
                <td>${occurrence.event_date}</td>
                <td>${formatDate(occurrence.occurrence_date, locale)}</td>
                <td>${this._relativeDayLabel(occurrence.occurrence_date)}</td>
                <td>
                  ${occurrence.anniversary}
                  ${isMilestone(occurrence)
                    ? html`<span class="milestone"
                        >${this._('Milestone')}</span
                      >`
                    : ''}
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
  }

  _renderGrid() {
    const [startYear, startMonth] = dateParts(this._start)
    const [endYear, endMonth] = dateParts(this._end)
    const months = []
    for (
      let index = startYear * 12 + startMonth - 1;
      index <= endYear * 12 + endMonth - 1;
      index += 1
    ) {
      months.push({year: Math.floor(index / 12), month: (index % 12) + 1})
    }
    return months.map(({year, month}) => this._renderMonthGrid(year, month))
  }

  _renderMonthGrid(year, month) {
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    const weekday = (first.getDay() + 6) % 7
    const eventsByDay = new Map()
    for (const occurrence of this._data) {
      const [occurrenceYear, occurrenceMonth, day] = dateParts(
        occurrence.occurrence_date
      )
      if (occurrenceYear !== year || occurrenceMonth !== month) continue
      eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), occurrence])
    }
    const locale = this.appState.i18n.lang || 'en'
    const weekdays = Array.from({length: 7}, (_, index) =>
      new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(
        new Date(2024, 0, index + 1)
      )
    )
    const monthName = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1))
    return html`<section>
      <h2>${monthName}</h2>
      <div class="month-grid">
        ${weekdays.map(day => html`<div class="weekday">${day}</div>`)}
        ${Array.from({length: weekday}, () => html`<div class="day"></div>`)}
        ${Array.from({length: last.getDate()}, (_, index) => {
          const day = index + 1
          return html`<div class="day">
            <div class="day-number">${day}</div>
            ${(eventsByDay.get(day) ?? []).map(
              occurrence => html`<span
                class="event ${isMilestone(occurrence) ? 'milestone' : ''}"
                title="${occurrence.summary}"
                >${occurrence.summary} (${occurrence.anniversary})</span
              >`
            )}
          </div>`
        })}
      </div>
    </section>`
  }

  renderContent() {
    if (!this._supportsAnniversaries()) return ''
    return html`
      <div class="header">
        <h1>${this._('Anniversaries')}</h1>
        ${this._renderViewButtons()}
      </div>
      <div class="range">
        <md-icon-button
          aria-label="${this._('Previous month')}"
          @click="${() => this._setMonth(-1)}"
          ><grampsjs-icon path="${mdiChevronLeft}"></grampsjs-icon
        ></md-icon-button>
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
        <md-outlined-button @click="${this._applyRange}">
          ${this._('Apply')}
        </md-outlined-button>
        <md-icon-button
          aria-label="${this._('Next month')}"
          @click="${() => this._setMonth(1)}"
          ><grampsjs-icon path="${mdiChevronRight}"></grampsjs-icon
        ></md-icon-button>
      </div>
      <div class="toolbar">
        <div class="types">
          <span class="types-label">${this._('Event types')}</span>
          ${this._types.map(
            type => html`<label
              ><md-checkbox
                value="${type}"
                ?checked="${this._eventTypes.includes(type)}"
                @change="${this._toggleType}"
              ></md-checkbox
              >${this._(type)}</label
            >`
          )}
        </div>
        <label class="option-label"
          >${this._('Living people only')}
          <md-switch
            ?selected="${this._livingOnly}"
            @change="${event => {
              this._livingOnly = event.target.selected
              this._load()
            }}"
          ></md-switch>
        </label>
      </div>
      <details>
        <summary>${this._('Advanced filters')}</summary>
        <div class="advanced-grid">
          <grampsjs-form-select-object
            id="anniversaries-anchor"
            label="${this._('Central person')}"
            objectType="person"
            .objects="${this._anchor ? [this._anchor] : []}"
            .appState="${this.appState}"
            @select-object:changed="${this._handleAnchor}"
          ></grampsjs-form-select-object>
          <md-outlined-button
            ?disabled="${!this._anchor}"
            @click="${this._clearAnchor}"
          >
            ${this._('Use whole tree')}
          </md-outlined-button>
          <label
            >${this._('Family radius')}
            <select
              ?disabled="${!this._anchor}"
              .value="${String(this._relationshipDepth)}"
              @change="${event => {
                this._relationshipDepth = Number(event.target.value) || 2
                this._load()
              }}"
            >
              <option value="1">${this._('Selected person only')}</option>
              <option value="2">${this._('Close family')}</option>
              ${Array.from(
                {length: 7},
                (_, index) => html`<option value="${index + 3}">
                  ${this._('Family radius')}: ${index + 3}
                </option>`
              )}
            </select>
          </label>
          <label class="option-label"
            >${this._('Include secondary participants')}
            <md-switch
              ?selected="${!this._primaryOnly}"
              @change="${event => {
                this._primaryOnly = !event.target.selected
                this._load()
              }}"
            ></md-switch>
          </label>
          <label
            >${this._('Person filter')}
            <select
              .value="${this._personFilter}"
              @change="${event => (this._personFilter = event.target.value)}"
            >
              <option value=""></option>
              ${this._filters.person.map(
                filter => html`<option value="${filterName(filter)}">
                  ${filterName(filter)}
                </option>`
              )}
            </select>
          </label>
          <label
            >${this._('Event filter')}
            <select
              .value="${this._eventFilter}"
              @change="${event => (this._eventFilter = event.target.value)}"
            >
              <option value=""></option>
              ${this._filters.event.map(
                filter => html`<option value="${filterName(filter)}">
                  ${filterName(filter)}
                </option>`
              )}
            </select>
          </label>
          <md-filled-text-field
            label="${this._('Person rules (JSON)')}"
            .value="${this._personRules}"
            @change="${event => (this._personRules = event.target.value)}"
          ></md-filled-text-field>
          <md-filled-text-field
            label="${this._('Event rules (JSON)')}"
            .value="${this._eventRules}"
            @change="${event => (this._eventRules = event.target.value)}"
          ></md-filled-text-field>
          <label
            >${this._('Person tag')}
            <select
              .value="${this._personTag}"
              @change="${event => (this._personTag = event.target.value)}"
            >
              <option value=""></option>
              ${this._tags.map(
                tag => html`<option value="${tag.name}">${tag.name}</option>`
              )}
            </select>
          </label>
          <label
            >${this._('Event tag')}
            <select
              .value="${this._eventTag}"
              @change="${event => (this._eventTag = event.target.value)}"
            >
              <option value=""></option>
              ${this._tags.map(
                tag => html`<option value="${tag.name}">${tag.name}</option>`
              )}
            </select>
          </label>
        </div>
        <md-outlined-button @click="${this._applyRange}">
          <grampsjs-icon slot="icon" path="${mdiFilter}"></grampsjs-icon>
          ${this._('Apply filters')}
        </md-outlined-button>
      </details>
      ${this._loading
        ? html`<p class="status">${this._('Loading...')}</p>`
        : ''}
      ${this._error ? html`<p class="error">${this._error}</p>` : ''}
      ${!this._loading && !this._error && !this._data.length
        ? html`<p class="status">${this._('No anniversaries found.')}</p>`
        : ''}
      ${this._mode === 'list' ? this._renderList() : this._renderGrid()}
      ${this._data.length < this._total
        ? html`<p>
            <md-outlined-button @click="${() => this._load(true)}">
              ${this._('Load more')}
            </md-outlined-button>
          </p>`
        : ''}
    `
  }
}

window.customElements.define(
  'grampsjs-view-anniversaries',
  GrampsjsViewAnniversaries
)
