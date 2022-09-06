/*
People list view
*/

import {html} from 'lit'
import {GrampsjsViewObjectsBase} from './GrampsjsViewObjectsBase.js'
import {prettyTimeDiffTimestamp, personFilter} from '../util.js'
import '../components/GrampsjsFilterYears.js'
import '../components/GrampsjsFilterProperties.js'
import '../components/GrampsjsFilterTags.js'

export class GrampsjsViewPeople extends GrampsjsViewObjectsBase {
  constructor() {
    super()
    this._columns = {
      grampsId: {title: 'Gramps ID', sort: 'gramps_id'},
      surname: {title: 'Surname', sort: 'surname'},
      given: {title: 'Given name', sort: ''},
      birth: {title: 'Birth Date', sort: 'birth'},
      death: {title: 'Death Date', sort: 'death'},
      change: {title: 'Last changed', sort: 'change'},
    }
  }

  get _fetchUrl() {
    return `/api/people/?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=self&keys=gramps_id,profile,change`
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return `person/${item.grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  _getAddPath() {
    return 'new_person'
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      surname: row?.profile?.name_surname,
      given: row?.profile?.name_given,
      birth: row?.profile?.birth?.date,
      death: row?.profile?.death?.date,
      change: prettyTimeDiffTimestamp(row.change, this.strings.__lang__),
    }
    return formattedRow
  }

  renderFilters() {
    return html`
      <grampsjs-filter-years
        .strings="${this.strings}"
        label="Birth year"
        rule="HasBirth"
      >
      </grampsjs-filter-years>
      <grampsjs-filter-years
        .strings="${this.strings}"
        label="Death year"
        rule="HasDeath"
      >
      </grampsjs-filter-years>

      <grampsjs-filter-properties
        .strings="${this.strings}"
        .filters="${this.filters}"
        .props="${personFilter}"
      ></grampsjs-filter-properties>

      <grampsjs-filter-tags
        .strings="${this.strings}"
        .filters="${this.filters}"
      ></grampsjs-filter-tags>
    `
  }
}

window.customElements.define('grampsjs-view-people', GrampsjsViewPeople)
