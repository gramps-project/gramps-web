/*
Medias list view
*/



import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp} from '../util.js'


export class GrampsjsViewMediaObjects extends GrampsjsViewObjectsBase {

  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      mime: {title: 'Type', sort: 'mime'},
      desc: {title: 'Description', sort: 'title'},
      change: {title: 'Last changed', sort: 'change'}

    }
  }

  get _fetchUrl() {
    return '/api/media/?keys=gramps_id,mime,desc,change'
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `media/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath (item) {
    return 'new_citation'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      mime: row.mime,
      desc: row.desc,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__)
    }
    return formattedRow
  }

}


window.customElements.define('grampsjs-view-media-objects', GrampsjsViewMediaObjects)
