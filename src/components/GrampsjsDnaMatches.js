import {html, css, LitElement} from 'lit'

import '@material/mwc-menu'
import '@material/mwc-list/mwc-list-item'

import './GrampsjsTable.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent, personDisplayName} from '../util.js'

class GrampsjsDnaMatches extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .match {
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0 20px;
        }

        .match:last-child {
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
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
      `${match.segments
        .reduce((accumulator, currentValue) => accumulator + currentValue.cM, 0)
        .toFixed(1)} cM`,
      match.segments.length,
      `${match.segments
        .reduce(
          (accumulator, currentValue) => Math.max(accumulator, currentValue.cM),
          0
        )
        .toFixed(1)} cM`,
    ])
  }

  render() {
    if (this.loading) {
      return this.renderLoading()
    }
    return html`
      <grampsjs-table
        linked
        .columns="${[
          'Name',
          'Relationship',
          'Shared DNA',
          'Shared Segments',
          'Largest Segment',
        ]}"
        .data="${this._computeTableData(this.data)}"
        .strings="${this.strings}"
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
        .columns="${[
          'Name',
          'Relationship',
          'Shared DNA',
          'Shared Segments',
          'Largest Segment',
        ]}"
        .data="${Array.from({length: numRows}).map(() => [
          'Name Name',
          'Father',
          '10 cM',
          '5',
          '10 cM',
        ])}"
        .strings="${this.strings}"
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
