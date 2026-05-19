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
    const [day, month, year] = date.dateval
    try {
      const sdn = dateToSdn(date.calendar, year, month, day)
      const typeStr =
        typeof event.type === 'string' ? event.type : event.type?.string || ''
      return {...event, jsDate: sdnToJsDate(sdn), eventType: typeStr}
    } catch {
      return {...event, jsDate: null}
    }
  })
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
      _placeFilter: {type: Object},
      _placeEventHandles: {type: Object},
    }
  }

  constructor() {
    super()
    this._data = []
    this._details = {}
    this._clickedHandle = null
    this._clickedDetail = null
    this._placeFilter = null
    this._placeEventHandles = null
  }

  async _fetchData() {
    const result = await this.appState.apiGet(
      '/api/events/?keys=gramps_id,handle,date,type'
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

  async _handlePlaceChanged(e) {
    const [place] = e.detail?.objects ?? []
    if (!place) {
      this._placeFilter = null
      this._placeEventHandles = null
      return
    }
    this._placeFilter = place
    const handle = place.object?.handle ?? place.handle
    const result = await this.appState.apiGet(
      `/api/places/${handle}?backlinks=1&keys=backlinks`
    )
    if ('data' in result) {
      this._placeEventHandles = new Set(result.data.backlinks?.event ?? [])
    }
  }

  get _filteredData() {
    if (!this._placeEventHandles) return this._data
    return this._data.filter(e => this._placeEventHandles.has(e.handle))
  }

  async _handleDotClick(handle) {
    if (!handle || handle === this._clickedHandle) {
      this._clickedHandle = null
      this._clickedDetail = null
      this._timelineEl()?.updateDetails(this._details)
      return
    }
    this._clickedHandle = handle
    if (handle in this._details) {
      this._clickedDetail = this._details[handle]
      return
    }
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${handle}&profile=self&locale=${locale}`
    )
    if (
      'data' in result &&
      result.data.length > 0 &&
      this._clickedHandle === handle
    ) {
      this._clickedDetail = result.data[0]
      this._timelineEl()?.updateDetails({
        ...this._details,
        [handle]: this._clickedDetail,
      })
    }
  }

  _timelineEl() {
    return this.renderRoot.querySelector('grampsjs-timeline')
  }

  async _handleZoomEnd({detail: {handles, innerWidth}}) {
    const threshold = Math.floor(innerWidth / MIN_LABEL_WIDTH)
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
    const locale = this.appState.i18n.lang || 'en'
    const result = await this.appState.apiGet(
      `/api/events/?handles=${handles.join(',')}&profile=self&locale=${locale}`
    )
    if ('data' in result) {
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
          objectType="place"
          .iconPath="${mdiFilter}"
          .appState="${this.appState}"
          @select-object:changed="${this._handlePlaceChanged}"
        ></grampsjs-form-select-object>
        ${this._placeFilter
          ? html`<grampsjs-filter-chip
              slot="filter"
              label="${this._placeFilter.object?.profile?.name ||
              this._placeFilter.object?.gramps_id ||
              ''}"
              .appState="${this.appState}"
              @filter-chip:clear="${() => {
                this.renderRoot
                  .querySelector('grampsjs-form-select-object')
                  ?.reset()
                this._handlePlaceChanged({detail: {objects: []}})
              }}"
            ></grampsjs-filter-chip>`
          : ''}
      </grampsjs-timeline>
    `
  }
}

window.customElements.define('grampsjs-view-timeline', GrampsjsViewTimeline)
