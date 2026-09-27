/*
Events list view
*/

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {
  prettyTimeDiffTimestamp,
  filterCounts,
  personTitleFromProfile,
  familyTitleFromProfile,
} from '../util.js'
import {
  associationsFilter,
  privacyFilter,
  tagFilter,
  textFilter,
  typeFilter,
  yearsFilter,
} from '../filterDefinitions.js'

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

  get _supportsMerge() {
    return true
  }

  get _fetchUrl() {
    return `/api/events/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=participants&keys=gramps_id,profile,description,change,handle`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `event/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_event'
  }

  get filterDefinitions() {
    const _ = s => this._(s)
    return [
      yearsFilter(_, {
        label: 'Event Year',
        rule: 'HasData',
        index: 1,
        numArgs: 4,
      }),
      typeFilter(_, {label: 'Event Type', typeName: 'event_types'}),
      textFilter(_, {
        label: 'Description',
        rule: 'HasData',
        index: 3,
        numArgs: 4,
      }),
      textFilter(_, {
        label: 'Place',
        rule: 'HasData',
        index: 2,
        numArgs: 4,
      }),
      associationsFilter(_, filterCounts.events),
      tagFilter(_),
      privacyFilter(_, {rule: 'EventPrivate'}),
    ]
  }

  _formatRow(row) {
    const people = (row?.profile?.participants?.people || [])
      .filter(p => PRIMARY_ROLES_EN.has(p.role) || p.role === this._('Primary'))
      .map(p => personTitleFromProfile(p.person))
    const families = (row?.profile?.participants?.families || [])
      .filter(f => PRIMARY_ROLES_EN.has(f.role) || f.role === this._('Family'))
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
