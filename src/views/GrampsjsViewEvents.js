/*
Events list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, filterCounts} from '../util.js'
import '../components/GrampsjsFilterType.js'
import '../components/GrampsjsFilterYears.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewEvents extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      type: {title: 'Event Type', sort: 'type'},
      date: {title: 'Date', sort: 'date'},
      place: {title: 'Place', sort: 'place'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._objectsName = 'events'
  }

  get _fetchUrl() {
    return `/api/events/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=self&keys=gramps_id,profile,change`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `event/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_event'
  }

  renderFilters() {
    return html`
      <grampsjs-filter-years
        .appState="${this.appState}"
        dateIndex="1"
        numArgs="4"
        label="${this._('Event Year')}"
        rule="HasData"
      ></grampsjs-filter-years>

      <grampsjs-filter-type
        .appState="${this.appState}"
        label="${this._('Event Type')}"
        typeName="event_types"
      ></grampsjs-filter-type>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.events}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: row?.profile?.type,
      date: row?.profile?.date,
      place: row?.profile?.place,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
    return formattedRow
  }
}

window.customElements.define('grampsjs-view-events', GrampsjsViewEvents)
