/*
Standalone calendar of recurring genealogical anniversaries.
*/

import {css, html} from 'lit'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiViewGrid,
  mdiViewList,
} from '@mdi/js'

import '@material/web/button/outlined-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'

import '../components/GrampsjsFilters.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPillToggle.js'
import '../components/GrampsjsTimedelta.js'
import {
  renderPersonAvatar,
  renderPersonDates,
} from '../components/personListUtils.js'
import {tagFilter} from '../filterDefinitions.js'
import {gregorianYmd} from '../gcalendar.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {GrampsjsView} from './GrampsjsView.js'

const PAGE_SIZE = 500
const DEFAULT_EVENT_TYPES = ['Birth', 'Marriage', 'Death']
const PRIMARY_ROLES = new Set(['Primary', 'Family'])

function isoDate(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-')
}

function fourWeekRange(value = new Date()) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 27)
  return {start: isoDate(start), end: isoDate(end)}
}

function shiftFourWeeks(value, amount) {
  const [year, month, day] = dateParts(value)
  const start = new Date(year, month - 1, day + amount * 28)
  const end = new Date(start)
  end.setDate(start.getDate() + 27)
  return {start: isoDate(start), end: isoDate(end)}
}

function dateParts(value) {
  return value.split('-').map(Number)
}

function rangeDates(start, end) {
  const result = []
  const [startYear, startMonth, startDay] = dateParts(start)
  const [endYear, endMonth, endDay] = dateParts(end)
  const startDate = new Date(startYear, startMonth - 1, startDay)
  const numberOfDays =
    (Date.UTC(endYear, endMonth - 1, endDay) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
    86400000
  for (let offset = 0; offset <= numberOfDays; offset += 1) {
    result.push(
      isoDate(
        new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + offset
        )
      )
    )
  }
  return result
}

function formatDate(value, locale) {
  const [year, month, day] = dateParts(value)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatRange(start, end, locale) {
  const [startYear, startMonth, startDay] = dateParts(start)
  const [endYear, endMonth, endDay] = dateParts(end)
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${formatter.format(
    new Date(startYear, startMonth - 1, startDay)
  )} – ${formatter.format(new Date(endYear, endMonth - 1, endDay))}`
}

function dateTimestamp(value) {
  const [year, month, day] = dateParts(value)
  return new Date(year, month - 1, day, 12).getTime() / 1000
}

function participantUrl(participant) {
  if (!participant?.gramps_id) return null
  return `/${participant.object_type}/${encodeURIComponent(
    participant.gramps_id
  )}`
}

function isMilestone(occurrence) {
  return occurrence.anniversary > 0 && occurrence.anniversary % 25 === 0
}

function combineRules(rules) {
  if (!rules.length) return null
  return {function: 'and', rules}
}

function includesTypeRule(rules) {
  return rules.some(
    rule =>
      rule.name === 'HasType' ||
      (Array.isArray(rule.rules) && includesTypeRule(rule.rules))
  )
}

function eventRules(filters) {
  const defaultTypes = {
    function: 'or',
    rules: DEFAULT_EVENT_TYPES.map(type => ({name: 'HasType', values: [type]})),
  }
  return combineRules([
    ...(includesTypeRule(filters) ? [] : [defaultTypes]),
    ...filters,
  ])
}

function exactGregorianDate(date) {
  const values = date?.dateval
  if (
    date?.modifier !== 0 ||
    date?.quality !== 0 ||
    !Array.isArray(values) ||
    values.length !== 4 ||
    values[0] < 1 ||
    values[1] < 1
  ) {
    return null
  }
  if (!date.sortval) return null
  const [year, month, day] = gregorianYmd(date.sortval)
  return {
    month,
    day,
    year: values[2] ? year : null,
  }
}

function participantRecords(
  event,
  primaryRoleLabels,
  translate = value => value
) {
  const profile = event.profile?.participants ?? {}
  const people = (profile.people ?? []).map(({person, role}) => ({
    object_type: 'person',
    handle: person?.handle,
    gramps_id: person?.gramps_id,
    name: person?.name_display || person?.gramps_id || '',
    person,
    personHandles: person?.handle ? [person.handle] : [],
    roleIsPrimary: primaryRoleLabels.has(role),
  }))
  const families = (profile.families ?? []).map(({family, role}) => {
    const parents = [family?.father, family?.mother].filter(Boolean)
    const names = parents.map(person => person.name_display).filter(Boolean)
    return {
      object_type: 'family',
      handle: family?.handle,
      gramps_id: family?.gramps_id,
      name: names.join(` ${translate('and')} `) || family?.family_surname || '',
      family,
      persons: parents,
      personHandles: parents.map(person => person.handle).filter(Boolean),
      roleIsPrimary: primaryRoleLabels.has(role),
    }
  })
  return [...people, ...families]
}

export function buildAnniversaryOccurrences({
  events,
  start,
  end,
  primaryRoleLabels = PRIMARY_ROLES,
  translate,
}) {
  const startYear = dateParts(start)[0]
  const endYear = dateParts(end)[0]
  const rangeStart = new Date(
    ...dateParts(start).map((value, index) => (index === 1 ? value - 1 : value))
  )
  const rangeEnd = new Date(
    ...dateParts(end).map((value, index) => (index === 1 ? value - 1 : value))
  )
  const occurrences = []

  for (const event of events) {
    const date = exactGregorianDate(event.date)
    if (!date) continue
    const participants = participantRecords(event, primaryRoleLabels, translate)
      .filter(participant => participant.roleIsPrimary)
      .map(({personHandles, roleIsPrimary, ...participant}) => participant)

    for (let year = startYear; year <= endYear; year += 1) {
      if (date.year !== null && year < date.year) continue
      const lastDay = new Date(year, date.month, 0).getDate()
      const occurrence = new Date(
        year,
        date.month - 1,
        Math.min(date.day, lastDay)
      )
      if (occurrence < rangeStart || occurrence > rangeEnd) continue
      const anniversary = date.year === null ? null : year - date.year
      const names = participants
        .map(participant => participant.name)
        .filter(Boolean)
      occurrences.push({
        anniversary,
        event,
        event_date: event.profile?.date || '',
        occurrence_date: isoDate(occurrence),
        participants,
        summary: [event.profile?.type || event.type, names.join(', ')]
          .filter(Boolean)
          .join(' - '),
        type: event.profile?.type || event.type,
      })
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.occurrence_date.localeCompare(right.occurrence_date) ||
      left.event.handle.localeCompare(right.event.handle)
  )
}

export class GrampsjsViewAnniversaryCalendar extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        .header,
        .range {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .header {
          justify-content: space-between;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
        }

        .range-label {
          flex: 1;
          text-align: center;
          font-weight: 500;
        }

        .participant-link {
          color: var(--md-sys-color-primary);
          text-decoration: none;
        }

        .participant-link:hover,
        .participant-link:focus-visible {
          text-decoration: underline;
        }

        .anniversary-row.milestone {
          --md-list-item-container-color: color-mix(
            in srgb,
            var(--md-sys-color-primary) 6%,
            var(--md-sys-color-surface)
          );
        }

        .calendar-scroll {
          overflow-x: auto;
        }

        .month-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(88px, 1fr));
          border-top: 1px solid var(--md-sys-color-outline-variant);
          border-left: 1px solid var(--md-sys-color-outline-variant);
          min-width: 620px;
        }

        .weekday,
        .day {
          min-height: 118px;
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

        .month-marker {
          margin-left: 4px;
          font-size: 0.8em;
          text-transform: uppercase;
        }

        .day.today {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 8%,
            transparent
          );
        }

        .day.past .day-number {
          opacity: 0.65;
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

        .event a {
          color: inherit;
          text-decoration: none;
        }

        .event a:hover,
        .event a:focus-visible {
          text-decoration: underline;
        }

        .event.milestone {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 18%,
            var(--md-sys-color-surface)
          );
          font-weight: 500;
        }

        .status {
          color: var(--grampsjs-body-font-color-50);
        }

        .error {
          color: var(--md-sys-color-error);
        }

        @media (max-width: 480px) {
          .range-label {
            flex-basis: 100%;
            order: -1;
          }
        }

        @media (max-width: 700px) {
          :host {
            margin: 20px;
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
      _loaded: {type: Boolean},
      _loading: {type: Boolean},
      _mode: {type: String},
      _start: {type: String},
      _eventRules: {type: Array},
      _eventQuery: {type: String},
    }
  }

  constructor() {
    super()
    const range = fourWeekRange()
    this._data = []
    this._error = ''
    this._loaded = false
    this._loading = false
    this._mode = 'list'
    this._requestSequence = 0
    this._start = range.start
    this._end = range.end
    this._isCurrentPeriod = true
    this._eventRules = []
    this._eventQuery = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundHandleVisibility = () => {
      if (!document.hidden && this.active) this._refreshData()
    }
    document.addEventListener('visibilitychange', this._boundHandleVisibility)
    this._scheduleDateRefresh()
  }

  disconnectedCallback() {
    document.removeEventListener(
      'visibilitychange',
      this._boundHandleVisibility
    )
    clearTimeout(this._dateRefreshTimer)
    super.disconnectedCallback()
  }

  _scheduleDateRefresh() {
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    )
    this._dateRefreshTimer = setTimeout(() => {
      this._refreshData()
      this._scheduleDateRefresh()
    }, nextMidnight.getTime() - now.getTime())
  }

  _refreshData() {
    if (this._isCurrentPeriod) {
      const range = fourWeekRange()
      this._start = range.start
      this._end = range.end
    }
    if (this.active) {
      this._loaded = true
      this._load()
    } else {
      this._isStale = true
    }
  }

  handleUpdateStaleData() {
    this._refreshData()
  }

  updated(changed) {
    super.updated(changed)
    if (this.active && !this._loaded) {
      this._loaded = true
      this._load()
    }
  }

  async _fetchPages(path, params) {
    const items = []
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({...params, page: String(page)})
      const result = await this.appState.apiGet(`${path}?${query}`)
      if (!result || result.error) {
        throw new Error(result?.error || this._('Error'))
      }
      const pageItems = Array.isArray(result.data) ? result.data : []
      items.push(...pageItems)
      const total = Number(result.total_count)
      if (
        pageItems.length < PAGE_SIZE ||
        (Number.isFinite(total) && items.length >= total)
      ) {
        return items
      }
    }
  }

  async _fetchEvents(requestId) {
    const dates = rangeDates(this._start, this._end)
    const months = [...new Set(dates.map(date => dateParts(date)[1]))]
    const rules = eventRules(this._eventRules)
    const locale = this.appState.i18n.lang || 'en'
    const monthResults = await Promise.all(
      months.map(month =>
        this._fetchPages('/api/events/', {
          dates: `*/${month}/*`,
          keys: 'date,handle,profile,type',
          locale,
          pagesize: String(PAGE_SIZE),
          profile: 'participants',
          ...(this._eventQuery ? {gql: this._eventQuery} : {}),
          ...(rules ? {rules: JSON.stringify(rules)} : {}),
        })
      )
    )
    if (requestId !== this._requestSequence) return []
    const byHandle = new Map()
    for (const event of monthResults.flat()) {
      if (event.handle) byHandle.set(event.handle, event)
    }
    return [...byHandle.values()]
  }

  async _load() {
    const requestId = ++this._requestSequence
    this._loading = true
    this._error = ''
    try {
      const events = await this._fetchEvents(requestId)
      if (requestId !== this._requestSequence) return
      this._data = buildAnniversaryOccurrences({
        events,
        start: this._start,
        end: this._end,
        primaryRoleLabels: new Set([
          ...PRIMARY_ROLES,
          this._('Primary'),
          this._('Family'),
        ]),
        translate: value => this._(value),
      })
    } catch (error) {
      if (requestId === this._requestSequence) {
        this._data = []
        this._error = error.message || this._('Error')
      }
    } finally {
      if (requestId === this._requestSequence) this._loading = false
    }
  }

  _setPeriod(offset) {
    const range = shiftFourWeeks(this._start, offset)
    this._start = range.start
    this._end = range.end
    this._isCurrentPeriod = range.start === fourWeekRange().start
    this._load()
  }

  _handleEventFilters(event) {
    this._eventRules = event.detail.filters
    this._eventQuery = event.detail.query
    this._load()
  }

  _renderViewButtons() {
    const options = [
      {value: 'list', label: this._('List view'), icon: mdiViewList},
      {value: 'grid', label: this._('Calendar'), icon: mdiViewGrid},
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
    const href = participantUrl(participant)
    return href
      ? html`<a class="participant-link" href="${href}"
          >${participant.name || this._('Unknown')}</a
        >`
      : participant.name || this._('Unknown')
  }

  _renderListItem(occurrence) {
    const person = occurrence.participants
      .map(participant => participant.person || participant.persons?.[0])
      .find(Boolean)
    const isMilestoneOccurrence = isMilestone(occurrence)
    return html`<md-list-item
      class="anniversary-row ${isMilestoneOccurrence ? 'milestone' : ''}"
      noninteractive
    >
      ${person ? renderPersonAvatar(person, person.profile?.sex) : ''}
      <span slot="headline">
        ${occurrence.type}:
        ${occurrence.participants.length
          ? occurrence.participants.map(participant =>
              this._renderParticipant(participant)
            )
          : this._('Unknown')}
      </span>
      ${occurrence.participants.flatMap(participant =>
        (participant.person
          ? [participant.person]
          : participant.persons || []
        ).map(personRecord => renderPersonDates(personRecord.profile))
      )}
      <span slot="supporting-text">${occurrence.event_date}</span>
      <span slot="supporting-text"
        >${formatDate(
          occurrence.occurrence_date,
          this.appState.i18n.lang || 'en'
        )}
        ·
        <grampsjs-timedelta
          timestamp="${dateTimestamp(occurrence.occurrence_date)}"
          locale="${this.appState.i18n.lang || 'en'}"
        ></grampsjs-timedelta
      ></span>
      <span slot="end">${occurrence.anniversary ?? this._('Unknown')}</span>
    </md-list-item>`
  }

  _renderList() {
    return html`<md-list class="large">
      ${this._data.map(occurrence => this._renderListItem(occurrence))}
    </md-list>`
  }

  _renderGrid() {
    const dates = rangeDates(this._start, this._end)
    const eventsByDay = new Map()
    for (const occurrence of this._data) {
      eventsByDay.set(occurrence.occurrence_date, [
        ...(eventsByDay.get(occurrence.occurrence_date) ?? []),
        occurrence,
      ])
    }
    const locale = this.appState.i18n.lang || 'en'
    const weekdays = Array.from({length: 7}, (_, index) =>
      new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(
        new Date(2024, 0, index + 1)
      )
    )
    const today = isoDate(new Date())
    return html`<section
      class="calendar-scroll"
      aria-label="${this._('Anniversaries')}"
    >
      <div class="month-grid">
        ${weekdays.map(day => html`<div class="weekday">${day}</div>`)}
        ${dates.map(date => {
          const [, month, day] = dateParts(date)
          return html`<div
            class="day ${date === today ? 'today' : ''} ${date < today
              ? 'past'
              : ''}"
          >
            <div class="day-number">
              ${day}${day === 1
                ? html`<span class="month-marker"
                    >${new Intl.DateTimeFormat(locale, {month: 'short'}).format(
                      new Date(2024, month - 1, 1)
                    )}</span
                  >`
                : ''}
            </div>
            ${(eventsByDay.get(date) ?? []).map(occurrence => {
              const participant = occurrence.participants[0]
              const href = participantUrl(participant)
              const label = `${occurrence.summary}${
                occurrence.anniversary === null
                  ? ''
                  : ` (${occurrence.anniversary})`
              }`
              return html`<span
                class="event ${isMilestone(occurrence) ? 'milestone' : ''}"
                >${href
                  ? html`<a href="${href}" title="${label}">${label}</a>`
                  : label}</span
              >`
            })}
          </div>`
        })}
      </div>
    </section>`
  }

  renderContent() {
    const translate = value => this._(value)
    const locale = this.appState.i18n.lang || 'en'
    return html`
      <div class="header">
        <h1>${this._('Anniversaries')}</h1>
        ${this._renderViewButtons()}
      </div>
      <div class="range">
        <md-icon-button
          aria-label="${this._('Previous')}"
          @click="${() => this._setPeriod(-1)}"
          ><grampsjs-icon path="${mdiChevronLeft}"></grampsjs-icon
        ></md-icon-button>
        <span class="range-label"
          >${formatRange(this._start, this._end, locale)}</span
        >
        <md-icon-button
          aria-label="${this._('Next')}"
          @click="${() => this._setPeriod(1)}"
          ><grampsjs-icon path="${mdiChevronRight}"></grampsjs-icon
        ></md-icon-button>
      </div>
      <grampsjs-filters
        .appState="${this.appState}"
        .definitions="${[tagFilter(translate)]}"
        namespace="events"
        @filters:changed="${this._handleEventFilters}"
      ></grampsjs-filters>
      ${this._loading
        ? html`<p class="status">${this._('Loading...')}</p>`
        : ''}
      ${this._error
        ? html`<div class="error">
            <p>${this._error}</p>
            <md-outlined-button @click="${this._load}"
              >${this._('Retry')}</md-outlined-button
            >
          </div>`
        : ''}
      ${!this._loading && !this._error && !this._data.length
        ? html`<p class="status">${this._('None')}.</p>`
        : ''}
      ${this._mode === 'list' ? this._renderList() : this._renderGrid()}
    `
  }
}

window.customElements.define(
  'grampsjs-view-anniversary-calendar',
  GrampsjsViewAnniversaryCalendar
)
