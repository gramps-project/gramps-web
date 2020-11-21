/*
Events list view
*/

import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewEvents extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      type: "Event Type",
      date: "Date",
      place: "Place",
    }
    this._fetchUrl = '/api/events/?profile=self&keys=gramps_id,profile'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `event/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: row?.profile?.type,
      date: row?.profile?.date,
      place: row?.profile?.place
    }
    return formattedRow
  }
}


window.customElements.define('grampsjs-view-events', GrampsjsViewEvents);
