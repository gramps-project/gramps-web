import {html, css, LitElement} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import './GrampsjsTable.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, personDisplayName} from '../util.js'

const columns = [
  {name: 'Name'},
  {name: 'Relationship'},
  {name: 'Shared DNA', unit: 'cM', format: value => value.toLocaleString()},
  {name: 'Shared Segments', format: value => value.toLocaleString()},
  {
    name: 'Largest Segment',
    unit: 'cM',
    format: value => value.toLocaleString(),
  },
]

class GrampsjsDnaMatches extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .match {
          border-top: 1px solid var(--grampsjs-body-font-color-10);
          padding: 0 20px;
        }

        .match:last-child {
          border-bottom: 1px solid var(--grampsjs-body-font-color-10);
        }
        .head {
          display: inline-block;
          margin-right: 2em;
          vertical-align: middle;
          width: 10rem;
          padding: 20px 0;
        }

        .name {
          font-weight: 350;
          font-size: 17px;
        }

        dl {
          display: inline-block;
          vertical-align: middle;
        }

        dd {
          font-size: 15px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      person: {type: Object},
      loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.person = {}
    this.loading = false
  }

  _computeTableData(data) {
    return data.map(match => [
      this._getNameFromHandle(match.handle),
      match.relation || this._('Unknown'),
      match.segments.reduce(
        (accumulator, currentValue) => accumulator + currentValue.cM,
        0
      ),
      match.segments.length,
      match.segments.reduce(
        (accumulator, currentValue) => Math.max(accumulator, currentValue.cM),
        0
      ),
    ])
  }

  render() {
    if (this.loading) {
      return this.renderLoading()
    }
    return html`
      <grampsjs-table
        linked
        sortable
        sort="2"
        descending
        .columns="${columns}"
        .data="${this._computeTableData(this.data)}"
        .appState="${this.appState}"
        @table:row-click="${this._handleRowClick}"
      ></grampsjs-table>
    `
  }

  _handleRowClick(e) {
    e.preventDefault()
    e.stopPropagation()
    fireEvent(this, 'dna-matches:row-selected', e.detail)
  }

  renderLoading() {
    const numRows =
      this.person?.person_ref_list?.filter(ref => ref.rel === 'DNA')?.length ??
      1
    return html`
      <grampsjs-table
        loading
        .columns="${columns}"
        .data="${Array.from({length: numRows}).map(() => [
          'Name Name',
          'Father',
          '10 cM',
          '5',
          '10 cM',
        ])}"
        .appState="${this.appState}"
      ></grampsjs-table>
    `
  }

  _getNameFromHandle(handle) {
    const people = this.person?.extended?.people || []
    let person = people.filter(p => p.handle === handle)
    if (person.length === 0) {
      return ''
    }
    // eslint-disable-next-line prefer-destructuring
    person = person[0]
    return personDisplayName(person)
  }

  _getGidFromHandle(handle) {
    const people = this.person?.extended?.people || []
    let person = people.filter(p => p.handle === handle)
    if (person.length === 0) {
      return ''
    }
    // eslint-disable-next-line prefer-destructuring
    person = person[0]
    return person.gramps_id
  }
}

window.customElements.define('grampsjs-dna-matches', GrampsjsDnaMatches)
