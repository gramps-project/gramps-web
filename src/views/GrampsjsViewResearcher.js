import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewResearcher extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        th,
        td {
          font-size: 14px;
          font-weight: 300;
          height: 20px;
          padding-bottom: 10px;
          padding-top: 10px;
          padding-right: 25px;
          padding-left: 0;
          text-align: left;
        }

        th {
          font-weight: 450;
          color: var(--grampsjs-body-font-color-100);
          text-align: right;
        }
      `,
    ]
  }

  renderContent() {
    const address = this._buildAddress()

    return html`
      <h3>${this._('Researcher Information')}</h3>

      <h4>${this.appState.dbInfo.researcher.name || '–'}</h4>

      <table>
        <tr>
          <th>${this._('E-mail')}</th>
          <td>${this.appState.dbInfo.researcher.email || '–'}</td>
        </tr>
        <tr>
          <th>${this._('Phone')}</th>
          <td>${this.appState.dbInfo.researcher.phone || '–'}</td>
        </tr>
        ${address
          ? html`<tr>
              <th>${this._('Address')}</th>
              <td>${address}</td>
            </tr>`
          : ''}
      </table>
    `
  }

  _buildAddress() {
    const address = []

    if (!this.appState.dbInfo.researcher) {
      return null
    }

    ;[
      this.appState.dbInfo.researcher.addr,
      this.appState.dbInfo.researcher.locality,
      this.appState.dbInfo.researcher.city,
      this.appState.dbInfo.researcher.state,
      this.appState.dbInfo.researcher.country,
      this.appState.dbInfo.researcher.postal,
    ]
      .filter(value => value)
      .forEach(value => address.push(value))

    return address.length === 0 ? null : address.join(', ')
  }
}

window.customElements.define('grampsjs-view-researcher', GrampsjsViewResearcher)
