import {html, css} from 'lit'
import {mdiFilter} from '@mdi/js'
import '../components/GrampsjsFilterChip.js'

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
    }
  }

  constructor() {
    super()
    this._data = []
    this._details = {}
    this._clickedHandle = null
    this._clickedDetail = null
    this._activeFilter = null
  }

  async _fetchData() {
    const result = await this.appState.apiGet(
      '/api/events/?keys=gramps_id,handle,date,type,place'
    )
    if ('data' in result) {
      this._data = preprocessEvents(result.data)
    }
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchData()
    this.addEventListener('timeline:zoom-end', e => this._handleZoomEnd(e))
    this.addEventListener('timeline:dot-click', e =>
      this._handleDotClick(e.detail.handle)
    )
  }

  _handleFilterChanged(e) {
    const [obj] = e.detail?.objects ?? []
    this._activeFilter = obj ?? null
  }

  _clearFilter() {
    this.renderRoot.querySelector('grampsjs-form-select-object')?.reset()
    this._activeFilter = null
  }

  get _filteredData() {
    if (!this._activeFilter) return this._data
    const obj = this._activeFilter.object
    if (this._activeFilter.object_type === 'person') {
      const handles = new Set(obj?.event_ref_list?.map(r => r.ref) ?? [])
      return this._data.filter(e => handles.has(e.handle))
    }
    if (this._activeFilter.object_type === 'place') {
      const handle = obj?.handle
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
      this._details = {}
      this._timelineEl()?.updateDetails(
        this._clickedDetail ? {[this._clickedHandle]: this._clickedDetail} : {}
      )
      return
    }
    if (handles.every(h => h in this._details)) {
      this._timelineEl()?.updateDetails(
        Object.fromEntries(handles.map(h => [h, this._details[h]]))
      )
      return
    }
    this._zoomSeq = (this._zoomSeq ?? 0) + 1
    const seq = this._zoomSeq
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${handles.join(',')}&profile=self&locale=${locale}`
    )
    if ('data' in result && seq === this._zoomSeq) {
      this._details = Object.fromEntries(result.data.map(e => [e.handle, e]))
      this._timelineEl()?.updateDetails(this._details)
    }
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  renderContent() {
    return html`
      <grampsjs-timeline
        .events="${this._filteredData}"
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
      </grampsjs-timeline>
    `
  }
}

window.customElements.define('grampsjs-view-timeline', GrampsjsViewTimeline)
