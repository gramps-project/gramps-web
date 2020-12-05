/*
People list view
*/


import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewPeople extends GrampsjsViewObjectsBase {

  constructor() {
    super();
    this._columns = {
      grampsId: "Gramps ID",
      surname: "Surname",
      given: "Given name",
      birth: "Birth Date",
      death: "Death Date",
    }
    this._fetchUrl = '/api/people/?profile=self,events&keys=gramps_id,profile'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `person/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      surname: row?.profile?.name_surname,
      given: row?.profile?.name_given,
      birth: row?.profile?.birth?.date,
      death: row?.profile?.death?.date,
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-people', GrampsjsViewPeople);
