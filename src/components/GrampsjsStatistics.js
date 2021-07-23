import {html, css} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'

const _classes = [
  'people',
  'families',
  'events',
  'places',
  'sources',
  'citations',
  'repositories',
  'notes',
  'media',
  'tags'
]

export class GrampsjsStatistics extends GrampsjsTableBase {

  static get styles() {
    return [
      super.styles,
      css`
      :host {
        margin-bottom: 5em;
      }
      `
    ]
  }

  render() {
    return html`
    <h2>${this._('Statistics')}</h2>
    <table>
      ${_classes.map(key => {
    if (!(key in this.data)) {
      return ''
    }
    return html`
      <tr>
        <th>
          ${this._(`Number of ${key}`)}
        </th>
        <td>
          ${this.data[key]}
        </td>
      </tr>
      `
  }, this)}
    </table>
    `
  }
}


window.customElements.define('grampsjs-statistics', GrampsjsStatistics)
