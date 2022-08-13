/*
Sources list view
*/

import { GrampsjsViewObjectsBase } from './GrampsjsViewObjectsBase.js';
import { prettyTimeDiffTimestamp } from '../util.js';

export class GrampsjsViewSources extends GrampsjsViewObjectsBase {
  constructor() {
    super();
    this._columns = {
      grampsId: { title: 'Gramps ID', sort: 'gramps_id' },
      title: { title: 'Title', sort: 'title' },
      author: { title: 'Author', sort: 'author' },
      pubinfo: { title: 'Publication info', sort: 'pubinfo' },
      change: { title: 'Last changed', sort: 'change' },
    };
  }

  get _fetchUrl() {
    return '/api/sources/?keys=gramps_id,title,author,pubinfo,change';
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `source/${item.grampsId}`;
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath(item) {
    return 'new_source';
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row, obj) {
    const formattedRow = {
      grampsId: row.gramps_id,
      title: row.title,
      author: row.author,
      pubinfo: row.pubinfo,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__),
    };
    return formattedRow;
  }
}

window.customElements.define('grampsjs-view-sources', GrampsjsViewSources);
