import {html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'

export class GrampsjsUrls extends GrampsjsTableBase {
  render() {
    if (Object.keys(this.data).length === 0) {
      return ''
    }
    return html`
      <table>
        <tr>
          <th>${this._('Type')}</th>
          <th>${this._('Path')}</th>
          <th>${this._('Description')}</th>
        </tr>
        ${this.data.map(
          obj => html`
            <tr>
              <td>${this._(obj.type)}</td>
              <td><a href="${obj.path}">${obj.path}</a></td>
              <td>${obj.desc}</td>
            </tr>
          `
        )}
      </table>
    `
  }
}

window.customElements.define('grampsjs-urls', GrampsjsUrls)
