import {css, html, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const namespaceLabels = {
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  citations: 'Citations',
  sources: 'Sources',
  repositories: 'Repositories',
  media: 'Media Objects',
  notes: 'Notes',
  tags: 'Tags',
}

// Object types with a non-zero count in an import result.
export function importedObjectTypes(counts) {
  return Object.keys(namespaceLabels).filter(type => (counts?.[type] || 0) > 0)
}

/**
 * Table of the object counts of an import result.
 * Renders nothing when all counts are zero.
 */
export class GrampsjsImportCounts extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }

        th,
        td {
          text-align: right;
          padding: 0.3em 0.6em;
        }

        th:first-child,
        td:first-child {
          text-align: left;
        }
      `,
    ]
  }

  static get properties() {
    return {
      counts: {type: Object},
    }
  }

  constructor() {
    super()
    this.counts = {}
  }

  render() {
    const types = importedObjectTypes(this.counts)
    if (types.length === 0) {
      return ''
    }
    return html`
      <table>
        <thead>
          <tr>
            <th>${this._('Object Type')}</th>
            <th>${this._('Count')}</th>
          </tr>
        </thead>
        <tbody>
          ${types.map(
            type => html`
              <tr>
                <td>${this._(namespaceLabels[type])}</td>
                <td>${this.counts[type]}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `
  }
}

window.customElements.define('grampsjs-import-counts', GrampsjsImportCounts)
