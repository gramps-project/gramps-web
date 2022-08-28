/*
Events list view
*/


import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'


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
  }

  get _fetchUrl() {
    return `/api/events/?locale=${this.strings?.__lang__ || 'en'}&profile=self&keys=gramps_id,profile,change`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `event/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath () {
    return 'new_event'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: row?.profile?.type,
      date: row?.profile?.date,
      place: row?.profile?.place,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__)
    }
    return formattedRow
  }
}


window.customElements.define('grampsjs-view-events', GrampsjsViewEvents)
