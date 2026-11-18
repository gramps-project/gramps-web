import {html, css, LitElement} from 'lit'
import {mdiAlertOutline} from '@mdi/js'

import './GrampsjsTable.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, personDisplayName} from '../util.js'
import {
  conflictWarning,
  groupLabel,
  matchRelationshipEstimate,
  supportsRelationshipEstimate,
} from '../dnaRelationship.js'
import {matchAssociation} from '../dnaMatch.js'
import {renderPrivacyIcon, rowPrivacy} from '../objectRender.js'

// A relationship cell is either a plain string or an object with the
// translated texts of the tree relationship or the DNA estimate
function renderRelationshipCell(value) {
  if (typeof value === 'string') {
    return value
  }
  // the cell renders in the shadow root of the table, so it is styled inline
  return html`${value.warning
    ? html`<svg
        role="img"
        aria-label="${value.warning}"
        height="18"
        width="18"
        viewBox="0 0 24 24"
        style="vertical-align: text-bottom; margin-right: 4px;"
      >
        <title>${value.warning}</title>
        <path
          fill="var(--grampsjs-alert-warn-border-color)"
          d="${mdiAlertOutline}"
        />
      </svg>`
    : ''}${value.estimated
    ? html`<span style="color: var(--grampsjs-body-font-color-60);"
        >≈ ${value.text}</span
      >`
    : value.text}`
}

// A name cell is either a plain string or an object with the name and the
// privacy icon of the match
function renderNameCell(value) {
  return typeof value === 'string' ? value : html`${value.text}${value.icon}`
}

const columnsByLocale = new Map()

// The table columns, with numbers formatted for `locale`. The same locale
// gets the same columns, so the table only updates when the locale changes.
function columns(locale) {
  if (!columnsByLocale.has(locale)) {
    const formatCm = new Intl.NumberFormat(locale, {maximumFractionDigits: 1})
    const formatCount = new Intl.NumberFormat(locale)
    columnsByLocale.set(locale, [
      {
        name: 'Name',
        format: value => renderNameCell(value),
        sortValue: value => (typeof value === 'string' ? value : value.text),
      },
      {
        name: 'Relationship',
        format: value => renderRelationshipCell(value),
        sortValue: value => (typeof value === 'string' ? value : value.text),
      },
      {
        name: 'Shared DNA',
        unit: 'cM',
        format: value => formatCm.format(value),
      },
      {name: 'Shared Segments', format: value => formatCount.format(value)},
      {
        name: 'Largest Segment',
        unit: 'cM',
        format: value => formatCm.format(value),
      },
    ])
  }
  return columnsByLocale.get(locale)
}

export class GrampsjsDnaMatches extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .match {
          padding: 0 20px;
        }

        .match + .match {
          border-top: 1px solid var(--grampsjs-divider-color);
        }
        .head {
          display: inline-block;
          margin-right: 2em;
          vertical-align: middle;
          width: 10rem;
          padding: 20px 0;
        }

        .name {
          font-weight: var(--grampsjs-font-weight-body);
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
      {
        text: this._getNameFromHandle(match.handle),
        icon: renderPrivacyIcon(
          rowPrivacy(matchAssociation(this.person, match)),
          this.appState
        ),
      },
      this._relationshipCell(match),
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

  // The relationship in the tree, with a warning if the shared DNA does not
  // fit it, or else the most probable relationship from the shared DNA
  _relationshipCell(match) {
    if (!supportsRelationshipEstimate(this.appState?.dbInfo)) {
      return match.relation || this._('Unknown')
    }
    const {estimate, check} = matchRelationshipEstimate(match)
    if (match.relation) {
      return {
        text: match.relation,
        estimated: false,
        warning: check?.conflict
          ? conflictWarning(check, (...args) => this._(...args), this._locale)
          : '',
      }
    }
    if (!estimate) {
      return this._('Unknown')
    }
    const [{group}] = estimate.groups
    return {
      text: groupLabel(group, (...args) => this._(...args)),
      estimated: true,
      warning: '',
    }
  }

  get _locale() {
    return (this.appState?.i18n?.lang || 'en').replace('_', '-')
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
        .columns="${this._columns}"
        .data="${this._computeTableData(this.data)}"
        .appState="${this.appState}"
        @table:row-click="${this._handleRowClick}"
      ></grampsjs-table>
    `
  }

  get _columns() {
    return columns(this._locale)
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
        .columns="${this._columns}"
        .data="${Array.from({length: numRows}).map(() => [
          'Name Name',
          'Father',
          10,
          5,
          10,
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
