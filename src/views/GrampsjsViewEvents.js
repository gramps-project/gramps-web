/*
Events list view
*/

import {html} from 'lit'
import '../components/GrampsjsFilterText.js'
import '../components/GrampsjsFilterType.js'
import '../components/GrampsjsFilterYears.js'
import '../components/GrampsjsFilterTags.js'
import '../components/GrampsjsFilterPrivate.js'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {
  prettyTimeDiffTimestamp,
  filterCounts,
  personTitleFromProfile,
  familyTitleFromProfile,
} from '../util.js'

const PRIMARY_ROLES_EN = new Set(['Primary', 'Family'])

export class GrampsjsViewEvents extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = [
      {name: 'Gramps ID', key: 'grampsId', sortKey: 'gramps_id'},
      {name: 'Event Type', key: 'type', sortKey: 'type'},
      {name: 'Date', key: 'date', sortKey: 'date'},
      {name: 'Place', key: 'place', sortKey: 'place'},
      {name: 'Participants', key: 'participants'},
      {name: 'Description', key: 'description', defaultVisible: false},
      {name: 'Last changed', key: 'change', sortKey: 'change'},
    ]
    this._objectsName = 'events'
  }

  get _fetchUrl() {
    return `/api/events/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&keys=gramps_id,profile,description,change`
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

      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Description"
        rule="HasData"
        .valueIndex=${3}
        .numArgs=${4}
      ></grampsjs-filter-text>

      <grampsjs-filter-text
        .appState="${this.appState}"
        label="Place"
        rule="HasData"
        .valueIndex=${2}
        .numArgs=${4}
      ></grampsjs-filter-text>

      <grampsjs-filter-properties
        hasCount
        .appState="${this.appState}"
        .props="${filterCounts.events}"
        label="${this._('Associations')}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags .appState="${this.appState}"></grampsjs-filter-tags>

      <grampsjs-filter-private
        .appState="${this.appState}"
        rule="EventPrivate"
      ></grampsjs-filter-private>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const people = (row?.profile?.participants?.people || [])
      .filter(p => PRIMARY_ROLES_EN.has(p.role))
      .map(p => personTitleFromProfile(p.person))
    const families = (row?.profile?.participants?.families || [])
      .filter(f => PRIMARY_ROLES_EN.has(f.role))
      .map(f => familyTitleFromProfile(f.family))
    return {
      grampsId: row.gramps_id,
      type: row?.profile?.type,
      date: row?.profile?.date,
      place: row?.profile?.place_name || row?.profile?.place,
      participants: [...people, ...families].join(', '),
      description: row?.description,
      change: prettyTimeDiffTimestamp(row.change, this.appState.i18n.lang),
    }
  }
}

window.customElements.define('grampsjs-view-events', GrampsjsViewEvents)
