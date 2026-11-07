import {html, css} from 'lit'

import {classMap} from 'lit/directives/class-map.js'
import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {fireEvent} from '../util.js'

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
  // 'tags'
]

export class GrampsjsStatistics extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin-bottom: 5em;
        }

        th,
        td {
          border-bottom: none;
          padding-top: 6px;
          padding-bottom: 6px;
          padding-left: 10px;
          padding-right: 10px;
        }

        th {
          text-align: left;
        }

        td {
          font-size: 1.2em;
          text-align: right;
          color: var(--grampsjs-body-font-color-70);
          font-weight: 450;
        }
      `,
    ]
  }

  render() {
    return html`
      <h3>${this._('Statistics')}</h3>
      <table>
        ${_classes.map(key => {
          if (!(key in this.data)) {
            return ''
          }
          return html`
            <tr
              class="${classMap({link: key !== 'tags'})}"
              @click=${() => this._handleClick(key)}
            >
              <td>${this.data[key]}</td>
              <th>${this._(key.charAt(0).toUpperCase() + key.slice(1))}</th>
            </tr>
          `
        }, this)}
      </table>
    `
  }

  _handleClick(key) {
    if (key !== 'tags') {
      // we don't have a tag list
      // media is the only case that needs special treatment
      const path = key === 'media' ? 'medialist' : key
      fireEvent(this, 'nav', {path})
    }
  }
}

window.customElements.define('grampsjs-statistics', GrampsjsStatistics)
