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
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/switch/switch.js'

import '../components/GrampsjsFilters.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsPillToggle.js'
import {getTreeId} from '../api.js'
import {tagFilter} from '../filterDefinitions.js'
import {gregorianYmd} from '../gcalendar.js'
import {fireEvent} from '../util.js'
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

function daysUntil(value, today = new Date()) {
  const [year, month, day] = dateParts(value)
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  return Math.round((new Date(year, month - 1, day) - current) / 86400000)
}

function isMilestone(occurrence) {
  return occurrence.anniversary > 0 && occurrence.anniversary % 25 === 0
}

function combineRules(rules) {
  if (!rules.length) return null
  return {function: 'and', rules}
}

function eventRules(types, filters) {
  const rules = [
    {
      function: 'or',
      rules: types.map(type => ({name: 'HasType', values: [type]})),
    },
    ...filters,
  ]
  return combineRules(rules)
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
      personHandles: parents.map(person => person.handle).filter(Boolean),
      roleIsPrimary: primaryRoleLabels.has(role),
    }
  })
  return [...people, ...families]
}

function matchesPeople(participants, allowedPeople) {
  if (!allowedPeople) return true
  return participants.some(participant =>
    participant.personHandles.some(handle => allowedPeople.has(handle))
  )
}

function matchesLiving(eventType, participants, livingPeople) {
  if (eventType === 'Death') return true
  if (eventType === 'Marriage') {
    const familyParticipants = participants.filter(
      participant => participant.object_type === 'family'
    )
    return familyParticipants.some(
      participant =>
        participant.personHandles.length >= 2 &&
        participant.personHandles.every(handle => livingPeople.has(handle))
    )
  }
  return participants.some(
    participant =>
      participant.object_type === 'person' &&
      participant.personHandles.some(handle => livingPeople.has(handle))
  )
}

export function buildAnniversaryOccurrences({
  events,
  start,
  end,
  eventTypes,
  livingOnly,
  primaryOnly,
  primaryRoleLabels = PRIMARY_ROLES,
  allowedPeople,
  livingPeople,
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
    if (!eventTypes.includes(event.type)) continue
    const date = exactGregorianDate(event.date)
    if (!date) continue
    const allParticipants = participantRecords(
      event,
      primaryRoleLabels,
      translate
    )
    const primaryParticipants = allParticipants.filter(
      participant => participant.roleIsPrimary
    )
    if (!matchesPeople(allParticipants, allowedPeople)) continue
    if (
      livingOnly &&
      !matchesLiving(event.type, primaryParticipants, livingPeople)
    ) {
      continue
    }
    const participants = (
      primaryOnly ? primaryParticipants : allParticipants
    ).map(({personHandles, roleIsPrimary, ...participant}) => participant)

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

export class GrampsjsViewAnniversaries extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .header,
        .range,
        .toolbar,
        .options,
        .selected-types,
        .type-list {
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

        .range-label {
          min-width: 240px;
          text-align: center;
          font-weight: 500;
        }

        .toolbar {
          justify-content: space-between;
          margin: 16px 0;
        }

        .types {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .option-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .type-list {
          gap: 6px;
        }

        .type-chip {
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 999px;
          padding: 5px 10px;
          background: var(--md-sys-color-surface-container-low);
          color: var(--md-sys-color-on-surface);
          cursor: pointer;
          font: inherit;
        }

        .type-chip:hover,
        .type-chip:focus-visible {
          border-color: var(--md-sys-color-primary);
        }

        .type-picker {
          min-width: 220px;
          max-width: 320px;
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

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 24px;
        }

        .filter-grid > * {
          min-width: 0;
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

        .anniversary-row.milestone {
          background: color-mix(
            in srgb,
            var(--md-sys-color-primary) 6%,
            transparent
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

        .status {
          color: var(--grampsjs-body-font-color-50);
        }

        .error {
          color: var(--md-sys-color-error);
        }

        @media (max-width: 760px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }

          .range-label {
            order: -1;
            flex-basis: 100%;
          }
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
      _requestSequence: {type: Number},
      _start: {type: String},
      _types: {type: Array},
      _typeLabels: {type: Object},
      _primaryRoleLabels: {type: Array},
      _livingOnly: {type: Boolean},
      _primaryOnly: {type: Boolean},
      _personRules: {type: Array},
      _personQuery: {type: String},
      _eventRules: {type: Array},
      _eventQuery: {type: String},
    }
  }

  constructor() {
    super()
    const range = fourWeekRange()
    this._data = []
    this._end = range.end
    this._error = ''
    this._eventTypes = [...DEFAULT_EVENT_TYPES]
    this._loaded = false
    this._loading = false
    this._mode = 'list'
    this._requestSequence = 0
    this._start = range.start
    this._end = range.end
    this._types = [...DEFAULT_EVENT_TYPES]
    this._typeLabels = Object.fromEntries(
      DEFAULT_EVENT_TYPES.map(type => [type, type])
    )
    this._primaryRoleLabels = [...PRIMARY_ROLES]
    this._livingOnly = true
    this._primaryOnly = true
    this._personRules = []
    this._personQuery = ''
    this._eventRules = []
    this._eventQuery = ''
    this._peopleCache = new Map()
  }

  updated(changed) {
    super.updated(changed)
    if (this.active && !this._loaded) {
      this._loaded = true
      this._loadOptions().finally(() => this._load())
    }
  }

  async _loadOptions() {
    try {
      const [canonical, localized] = await Promise.all([
        this.appState.apiGet('/api/types/'),
        this.appState.apiGet('/api/types/?locale=true'),
      ])
      if (canonical?.error || localized?.error) return
      const canonicalDefault = canonical.data?.default?.event_types ?? []
      const canonicalCustom = canonical.data?.custom?.event_types ?? []
      const localizedDefault = localized.data?.default?.event_types ?? []
      const localizedCustom = localized.data?.custom?.event_types ?? []
      const canonicalRoles = canonical.data?.default?.event_role_types ?? []
      const localizedRoles = localized.data?.default?.event_role_types ?? []
      this._types = [...new Set([...canonicalDefault, ...canonicalCustom])]
      this._typeLabels = Object.fromEntries([
        ...canonicalDefault.map((type, index) => [
          type,
          localizedDefault[index] ?? type,
        ]),
        ...canonicalCustom.map((type, index) => [
          type,
          localizedCustom[index] ?? type,
        ]),
      ])
      this._primaryRoleLabels = [
        ...PRIMARY_ROLES,
        ...['Primary', 'Family']
          .map(type => canonicalRoles.indexOf(type))
          .filter(index => index >= 0)
          .map(index => localizedRoles[index]),
      ]
    } catch {
      // Keep the built-in event types and English role names as a fallback.
    }
  }

  async _fetchPages(path, params) {
    const items = []
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({...params, page: String(page)})
      const result = await this.appState.apiGet(`${path}?${query}`)
      if (!result || result.error) {
        throw new Error(
          result?.error || this._('Unable to load anniversaries.')
        )
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

  async _fetchPeople(rules, query) {
    const key = JSON.stringify({
      rules,
      query,
      locale: this.appState.i18n.lang || 'en',
      tree: getTreeId() || '',
    })
    if (!this._peopleCache.has(key)) {
      const request = this._fetchPages('/api/people/', {
        keys: 'handle',
        locale: this.appState.i18n.lang || 'en',
        pagesize: String(PAGE_SIZE),
        ...(query ? {gql: query} : {}),
        ...(rules ? {rules: JSON.stringify(rules)} : {}),
      })
        .then(people => new Set(people.map(person => person.handle)))
        .catch(error => {
          this._peopleCache.delete(key)
          throw error
        })
      this._peopleCache.set(key, request)
    }
    return this._peopleCache.get(key)
  }

  async _fetchEvents(requestId) {
    const dates = rangeDates(this._start, this._end)
    const months = [...new Set(dates.map(date => dateParts(date)[1]))]
    const rules = eventRules(this._eventTypes, this._eventRules)
    const locale = this.appState.i18n.lang || 'en'
    const monthResults = await Promise.all(
      months.map(month =>
        this._fetchPages('/api/events/', {
          dates: `*/${month}/*`,
          keys: 'date,gramps_id,handle,profile,type',
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
    if (!this._eventTypes.length) {
      this._requestSequence += 1
      this._loading = false
      this._data = []
      this._error = this._('Select at least one event type.')
      return
    }
    const requestId = ++this._requestSequence
    this._loading = true
    this._error = ''
    try {
      const today = isoDate(new Date())
      const personRules = combineRules(this._personRules)
      const livingRules = this._livingOnly
        ? combineRules([
            ...this._personRules,
            {name: 'ProbablyAlive', values: [today]},
          ])
        : null
      const [events, allowedPeople, livingPeople] = await Promise.all([
        this._fetchEvents(requestId),
        personRules || this._personQuery
          ? this._fetchPeople(personRules, this._personQuery)
          : Promise.resolve(null),
        livingRules
          ? this._fetchPeople(livingRules, this._personQuery)
          : Promise.resolve(null),
      ])
      if (requestId !== this._requestSequence) return
      this._data = buildAnniversaryOccurrences({
        events,
        start: this._start,
        end: this._end,
        eventTypes: this._eventTypes,
        livingOnly: this._livingOnly,
        primaryOnly: this._primaryOnly,
        primaryRoleLabels: new Set(this._primaryRoleLabels),
        allowedPeople,
        livingPeople,
        translate: value => this._(value),
      })
    } catch (error) {
      if (requestId === this._requestSequence) {
        this._data = []
        this._error = error.message || this._('Unable to load anniversaries.')
      }
    } finally {
      if (requestId === this._requestSequence) this._loading = false
    }
  }

  _setPeriod(offset) {
    const range = shiftFourWeeks(this._start, offset)
    this._start = range.start
    this._end = range.end
    this._load()
  }

  _addEventType(event) {
    const type = event.target.value
    if (!type) return
    this._eventTypes = [...this._eventTypes, type]
    event.target.value = ''
    this._load()
  }

  _removeEventType(type) {
    this._eventTypes = this._eventTypes.filter(value => value !== type)
    this._load()
  }

  _handlePersonFilters(event) {
    this._personRules = event.detail.filters
    this._personQuery = event.detail.query
    this._peopleCache.clear()
    this._load()
  }

  _handleEventFilters(event) {
    this._eventRules = event.detail.filters
    this._eventQuery = event.detail.query
    this._load()
  }

  _navigate(participant) {
    if (!participant?.gramps_id) return
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
    const locale = this.appState.i18n.lang || 'en'
    return new Intl.RelativeTimeFormat(locale, {numeric: 'auto'}).format(
      remaining,
      'day'
    )
  }

  _renderList() {
    const locale = this.appState.i18n.lang || 'en'
    const today = isoDate(new Date())
    const upcoming = this._data.filter(
      occurrence => occurrence.occurrence_date >= today
    )
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
          ${upcoming.map(
            occurrence => html`
              <tr
                class="anniversary-row ${isMilestone(occurrence)
                  ? 'milestone'
                  : ''}"
              >
                <td>${occurrence.type}</td>
                <td>
                  ${occurrence.participants.length
                    ? occurrence.participants.map(p =>
                        this._renderParticipant(p)
                      )
                    : this._('Unknown')}
                </td>
                <td>${occurrence.event_date}</td>
                <td>${formatDate(occurrence.occurrence_date, locale)}</td>
                <td>${this._relativeDayLabel(occurrence.occurrence_date)}</td>
                <td>${occurrence.anniversary ?? this._('Unknown')}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
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
      aria-label="${this._('Four-week calendar')}"
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
            ${(eventsByDay.get(date) ?? []).map(
              occurrence => html`<span
                class="event ${isMilestone(occurrence) ? 'milestone' : ''}"
                title="${occurrence.summary}"
                >${occurrence.summary}${occurrence.anniversary === null
                  ? ''
                  : ` (${occurrence.anniversary})`}</span
              >`
            )}
          </div>`
        })}
      </div>
    </section>`
  }

  renderContent() {
    const translate = value => this._(value)
    const availableTypes = this._types.filter(
      type => !this._eventTypes.includes(type)
    )
    const locale = this.appState.i18n.lang || 'en'
    return html`
      <div class="header">
        <h1>${this._('Anniversaries')}</h1>
        ${this._renderViewButtons()}
      </div>
      <div class="range">
        <md-icon-button
          aria-label="${this._('Previous four weeks')}"
          @click="${() => this._setPeriod(-1)}"
          ><grampsjs-icon path="${mdiChevronLeft}"></grampsjs-icon
        ></md-icon-button>
        <span class="range-label"
          >${formatRange(this._start, this._end, locale)}</span
        >
        <md-icon-button
          aria-label="${this._('Next four weeks')}"
          @click="${() => this._setPeriod(1)}"
          ><grampsjs-icon path="${mdiChevronRight}"></grampsjs-icon
        ></md-icon-button>
      </div>
      <div class="toolbar">
        <div class="options">
          <label class="option-label"
            >${this._('Living people only')}
            <md-switch
              ?selected="${this._livingOnly}"
              @change="${event => {
                this._livingOnly = event.target.selected
                this._peopleCache.clear()
                this._load()
              }}"
            ></md-switch>
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
        </div>
      </div>
      <section class="types" aria-label="${this._('Event types')}">
        <strong>${this._('Event types')}</strong>
        <div class="selected-types">
          ${this._eventTypes.map(
            type => html`<button
              class="type-chip"
              type="button"
              aria-label="${this._('Remove event type')}: ${this._typeLabels[
                type
              ] || type}"
              @click="${() => this._removeEventType(type)}"
            >
              ${this._typeLabels[type] || type} ×
            </button>`
          )}
        </div>
        <md-filled-select
          class="type-picker"
          label="${this._('Add event type')}"
          @change="${this._addEventType}"
        >
          <md-select-option value="">
            <div slot="headline">${this._('Select an event type')}</div>
          </md-select-option>
          ${availableTypes.map(
            type => html`<md-select-option value="${type}">
              <div slot="headline">${this._typeLabels[type] || type}</div>
            </md-select-option>`
          )}
        </md-filled-select>
      </section>
      <details>
        <summary>${this._('Filters')}</summary>
        <div class="filter-grid">
          <section>
            <h3>${this._('Person filters')}</h3>
            <grampsjs-filters
              .appState="${this.appState}"
              .definitions="${[tagFilter(translate)]}"
              namespace="people"
              @filters:changed="${this._handlePersonFilters}"
            ></grampsjs-filters>
          </section>
          <section>
            <h3>${this._('Event filters')}</h3>
            <grampsjs-filters
              .appState="${this.appState}"
              .definitions="${[tagFilter(translate)]}"
              namespace="events"
              @filters:changed="${this._handleEventFilters}"
            ></grampsjs-filters>
          </section>
        </div>
      </details>
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
        ? html`<p class="status">${this._('No anniversaries found.')}</p>`
        : ''}
      ${!this._loading &&
      !this._error &&
      this._data.length &&
      this._mode === 'list' &&
      !this._data.some(item => item.occurrence_date >= isoDate(new Date()))
        ? html`<p class="status">
            ${this._('No upcoming anniversaries in this period.')}
          </p>`
        : ''}
      ${this._mode === 'list' ? this._renderList() : this._renderGrid()}
    `
  }
}

window.customElements.define(
  'grampsjs-view-anniversaries',
  GrampsjsViewAnniversaries
)
