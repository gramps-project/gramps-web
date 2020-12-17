/*
Repositories list view
*/

import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'


export class GrampsjsViewRepositories extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      name: {title: 'Name', sort: 'name'},
      type: {title: 'Type', sort: 'type'},
      change: {title: 'Last changed', sort: 'change'},
    }
    this._fetchUrl = '/api/repositories/?keys=gramps_id,name,type,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `repository/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      name: row.name,
      type: this._(row.type),
      change: row.change
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-repositories', GrampsjsViewRepositories)
