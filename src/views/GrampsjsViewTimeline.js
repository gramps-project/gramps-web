import {html, css} from 'lit'
import {mdiFilter} from '@mdi/js'
import '../components/GrampsjsFilterChip.js'
import '../components/GrampsjsPillToggle.js'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {dateToSdn, sdnToJsDate} from '../gcalendar.js'
import '../components/GrampsjsTimeline.js'
import '../components/GrampsjsFormSelectObject.js'

const MIN_LABEL_WIDTH = 90

function preprocessEvents(events) {
  return events.map(event => {
    const {date} = event
    if (!date?.dateval || date.sortval === 0) return {...event, jsDate: null}
    const modifier = date.modifier ?? 0
    if (modifier === 4) return {...event, jsDate: null}
    const quality = date.quality ?? 0
    const [day, month, year] = date.dateval
    try {
      const sdn = dateToSdn(date.calendar, year, month, day)
      const typeStr =
        typeof event.type === 'string' ? event.type : event.type?.string || ''
      return {
        ...event,
        jsDate: sdnToJsDate(sdn),
        eventType: typeStr,
        placeHandle: event.place || null,
        modifier,
        quality,
      }
    } catch {
      return {...event, jsDate: null}
    }
  })
}

function filterLabel(obj) {
  if (!obj) return ''
  const o = obj.object
  if (obj.object_type === 'person') {
    return (
      [o?.profile?.name_given, o?.profile?.name_surname]
        .filter(Boolean)
        .join(' ') ||
      o?.gramps_id ||
      ''
    )
  }
  return o?.profile?.name || o?.gramps_id || ''
}

export class GrampsjsViewTimeline extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      ...super.properties,
      _data: {type: Array},
      _activeFilter: {type: Object},
      _personFilterMode: {type: String},
      _filterEventHandles: {type: Object},
      _detailsLoading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._data = []
    this._details = {}
    this._clickedHandle = null
    this._clickedDetail = null
    this._activeFilter = null
    this._personFilterMode = 'self'
    this._filterEventHandles = null
    this._pendingHandle = null
    this._detailsLoading = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundEventSelected = e => this._handleExternalEventSelected(e)
    window.addEventListener('timeline:event-selected', this._boundEventSelected)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'timeline:event-selected',
      this._boundEventSelected
    )
  }

  _handleExternalEventSelected({detail: {handle}}) {
    if (this._activeFilter) {
      this._clearFilter()
    }
    this._pendingHandle = handle
    this._applyPendingHandle()
  }

  async _applyPendingHandle() {
    if (!this._pendingHandle || !this._data.length) return
    const event = this._data.find(e => e.handle === this._pendingHandle)
    if (!event?.jsDate) {
      this._pendingHandle = null
      return
    }
    // Wait for Lit to propagate new events to grampsjs-timeline so that
    // updateEvents() runs before scrollToDate — otherwise updateEvents resets
    // the zoom to zoomIdentity and cancels our scroll transition.
    await this.updateComplete
    if (!this._timelineEl()?.scrollToDate(event.jsDate)) return
    this._pendingHandle = null
  }

  async _fetchData() {
    const result = await this.appState.apiGet(
      '/api/events/?keys=gramps_id,handle,date,type,place'
    )
    if ('data' in result) {
      this._data = preprocessEvents(result.data)
      this._applyPendingHandle()
    }
  }

  async _fetchRelationshipEvents() {
    const grampsId = this._activeFilter?.object?.gramps_id
    const mode = this._personFilterMode
    if (!grampsId || mode === 'self') return
    this._relSeq = (this._relSeq ?? 0) + 1
    const seq = this._relSeq
    const ruleName =
      mode === 'ancestors'
        ? 'IsLessThanNthGenerationAncestorOf'
        : 'IsLessThanNthGenerationDescendantOf'
    // depth 100 is intentionally large — actual results are bounded by tree size
    const rules = {rules: [{name: ruleName, values: [grampsId, 100]}]}
    const result = await this.appState.apiGet(
      `/api/people/?rules=${encodeURIComponent(
        JSON.stringify(rules)
      )}&keys=handle,event_ref_list`
    )
    if (seq !== this._relSeq) return
    if ('data' in result) {
      this._filterEventHandles = new Set(
        result.data.flatMap(p => (p.event_ref_list ?? []).map(r => r.ref))
      )
    } else if ('error' in result) {
      this._filterEventHandles = new Set()
      this.dispatchEvent(
        new CustomEvent('grampsjs:error', {
          bubbles: true,
          composed: true,
          detail: {message: result.error},
        })
      )
    }
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchData()
    // Debounce so a fetch only starts once the user pauses zooming.
    let debounceTimer = null
    this.addEventListener('timeline:zoom-end', e => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        this._handleZoomEnd(e)
        this._applyPendingHandle()
      }, 150)
    })
    this.addEventListener('timeline:dot-click', e =>
      this._handleDotClick(e.detail.handle)
    )
  }

  _resetClickedState() {
    this._clickedHandle = null
    this._clickedDetail = null
    this._details = {}
    this._timelineEl()?.updateDetails({})
  }

  _handleFilterChanged(e) {
    const [obj] = e.detail?.objects ?? []
    this._activeFilter = obj ?? null
    this._personFilterMode = 'self'
    this._filterEventHandles = null
    this._resetClickedState()
  }

  _clearFilter() {
    this.renderRoot.querySelector('grampsjs-form-select-object')?.reset()
    this._activeFilter = null
    this._personFilterMode = 'self'
    this._filterEventHandles = null
    this._resetClickedState()
  }

  _handleFilterModeChange(e) {
    this._personFilterMode = e.detail.value
    this._filterEventHandles = null
    this._resetClickedState()
    if (this._personFilterMode !== 'self') {
      this._fetchRelationshipEvents()
    }
  }

  get _filteredData() {
    if (!this._activeFilter) return this._data
    if (this._activeFilter.object_type === 'person') {
      if (this._personFilterMode !== 'self') {
        if (!this._filterEventHandles) return []
        return this._data.filter(e => this._filterEventHandles.has(e.handle))
      }
      const obj = this._activeFilter.object
      const handles = new Set(obj?.event_ref_list?.map(r => r.ref) ?? [])
      return this._data.filter(e => handles.has(e.handle))
    }
    if (this._activeFilter.object_type === 'place') {
      const handle = this._activeFilter.object?.handle
      return this._data.filter(e => e.placeHandle === handle)
    }
    return this._data
  }

  _colocatedHandles(handle) {
    const clicked = this._filteredData.find(e => e.handle === handle)
    if (!clicked?.jsDate) return [handle]
    const t = clicked.jsDate.getTime()
    return this._filteredData
      .filter(e => e.jsDate?.getTime() === t)
      .map(e => e.handle)
  }

  async _handleDotClick(handle) {
    if (!handle || handle === this._clickedHandle) {
      this._clickedHandle = null
      this._clickedDetail = null
      this._timelineEl()?.updateDetails(this._details)
      return
    }
    this._clickedHandle = handle
    const handles = this._colocatedHandles(handle)
    const toFetch = handles.filter(h => !(h in this._details))
    if (!toFetch.length) {
      this._clickedDetail = this._details[handle]
      return
    }
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${toFetch.join(',')}&profile=self&locale=${locale}`
    )
    if (
      'data' in result &&
      result.data.length > 0 &&
      this._clickedHandle === handle
    ) {
      const fetched = Object.fromEntries(result.data.map(e => [e.handle, e]))
      this._details = {...this._details, ...fetched}
      this._clickedDetail = this._details[handle] ?? result.data[0]
      this._timelineEl()?.updateDetails(this._details)
    }
  }

  _timelineEl() {
    return this.renderRoot.querySelector('grampsjs-timeline')
  }

  async _handleZoomEnd({detail: {handles, innerWidth}}) {
    const threshold = Math.max(5, Math.floor(innerWidth / MIN_LABEL_WIDTH))
    if (handles.length === 0 || handles.length > threshold) {
      this._pendingHandlesKey = null
      this._details = {}
      this._detailsLoading = false
      this._timelineEl()?.updateDetails(
        this._clickedDetail ? {[this._clickedHandle]: this._clickedDetail} : {}
      )
      return
    }
    if (handles.every(h => h in this._details)) {
      this._pendingHandlesKey = null
      this._detailsLoading = false
      this._timelineEl()?.updateDetails(
        Object.fromEntries(handles.map(h => [h, this._details[h]]))
      )
      return
    }
    // Record which handles we're fetching; discard the result if the view
    // has moved on by the time the response arrives.
    const key = handles.join(',')
    this._pendingHandlesKey = key
    this._detailsLoading = true
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${key}&profile=self&locale=${locale}`
    )
    if (key === this._pendingHandlesKey) {
      this._detailsLoading = false
      if ('data' in result) {
        this._details = Object.fromEntries(result.data.map(e => [e.handle, e]))
        this._timelineEl()?.updateDetails(this._details)
      } else {
        this._details = {}
        this._timelineEl()?.updateDetails({})
      }
    }
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  renderContent() {
    const isPersonFilter = this._activeFilter?.object_type === 'person'
    const pillOptions = [
      {value: 'self', label: this._('Person')},
      {value: 'ancestors', label: this._('Ancestors')},
      {value: 'descendants', label: this._('Descendants')},
    ]
    return html`
      <grampsjs-timeline
        .events="${this._filteredData}"
        .detailsLoading="${this._detailsLoading}"
        .appState="${this.appState}"
      >
        <grampsjs-form-select-object
          slot="filter"
          label="${this._('filter')}"
          objectType="person,place"
          .iconPath="${mdiFilter}"
          .appState="${this.appState}"
          @select-object:changed="${this._handleFilterChanged}"
        ></grampsjs-form-select-object>
        ${this._activeFilter
          ? html`<grampsjs-filter-chip
              slot="filter"
              label="${filterLabel(this._activeFilter)}"
              .appState="${this.appState}"
              @filter-chip:clear="${this._clearFilter}"
            ></grampsjs-filter-chip>`
          : ''}
        ${isPersonFilter
          ? html`<grampsjs-pill-toggle
              slot="filter-options"
              .options="${pillOptions}"
              .selected="${this._personFilterMode}"
              .appState="${this.appState}"
              @pill-toggle:change="${this._handleFilterModeChange}"
            ></grampsjs-pill-toggle>`
          : ''}
      </grampsjs-timeline>
    `
  }
}

window.customElements.define('grampsjs-view-timeline', GrampsjsViewTimeline)
