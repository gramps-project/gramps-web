import {html, css} from 'lit'

import {classMap} from 'lit/directives/class-map.js'
import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {appHref, handleAppLinkClick} from '../util.js'

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

        td,
        th {
          position: relative;
        }

        /* The link covers its whole cell, so that the browser offers to open
           the page in a new tab anywhere in the row */
        a:link,
        a:visited,
        a:hover {
          color: inherit;
          text-decoration: none;
        }

        a::after {
          content: '';
          position: absolute;
          inset: 0;
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
              @click=${e => this._handleClick(e, key)}
            >
              <td>${this._renderCell(key, this.data[key], -1)}</td>
              <th>
                ${this._renderCell(
                  key,
                  this._(key.charAt(0).toUpperCase() + key.slice(1))
                )}
              </th>
            </tr>
          `
        }, this)}
      </table>
    `
  }

  // Only the link of the label is a tab stop for the keyboard
  _renderCell(key, content, tabindex = 0) {
    return key === 'tags'
      ? content
      : html`<a href="${appHref(this._getPath(key))}" tabindex="${tabindex}"
          >${content}</a
        >`
  }

  _handleClick(e, key) {
    // we don't have a tag list
    if (key !== 'tags') {
      handleAppLinkClick(e, this._getPath(key))
    }
  }

  // media is the only case that needs special treatment
  // eslint-disable-next-line class-methods-use-this
  _getPath(key) {
    return key === 'media' ? 'medialist' : key
  }
}

window.customElements.define('grampsjs-statistics', GrampsjsStatistics)
