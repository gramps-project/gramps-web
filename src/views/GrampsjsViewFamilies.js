/*
Families list view
*/



import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'


export class GrampsjsViewFamilies extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      father: {title: 'Father', sort: 'surname'},
      mother: {title: 'Mother', sort: ''},
      change: {title: 'Last changed', sort: 'change'},
    }
  }

  get _fetchUrl() {
    return `/api/families/?locale=${this.strings?.__lang__ || 'en'}&profile=self&keys=gramps_id,profile,change`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `family/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath (item) {
    return 'new_family'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      father: `${row?.profile?.father?.name_surname || '…'}, ${row?.profile?.father?.name_given || '…'}`,
      mother: `${row?.profile?.mother?.name_surname || '…'}, ${row?.profile?.mother?.name_given || '…'}`,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__)
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-families', GrampsjsViewFamilies)
