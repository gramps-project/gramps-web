import {css, html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'


export class GrampsjsEvents extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
      tr:hover td {
        background-color: #f0f0f0;
        cursor: pointer;
      }
    `]
  }

  static get properties() {
    return {
      data: {type: Array},
      profile: {type: Array},
      strings: {type: Object}
    }
  }

  constructor() {
    super()
    this.data = []
    this.profile = []
    this.strings = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html`hae`
    }
    return html`
    <table>
      <tr>
        <th>${this._('Date')}</th>
        <th>${this._('Type')}</th>
        <th>${this._('Description')}</th>
        <th>${this._('Place')}</th>
        <th></th>
      </tr>
    ${this.data.map((obj, i) => html`
      <tr @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${this.profile[i].date}</td>
        <td>${this.profile[i].type}
        ${!this.profile[i]?.role || [this._('Primary'), this._('Family')].includes(this.profile[i]?.role) ? ''
    : `(${this.profile[i]?.role})`} </td>
        <td>${obj.description}</td>
        <td>${this.profile[i].place}</td>
        <td>${obj?.media_list?.length > 0 ? html`
        <mwc-icon class="inline">photo</mwc-icon>` : ''}
            ${obj?.note_list?.length > 0 > 0 ? html`
        <mwc-icon class="inline">sticky_note_2</mwc-icon>` : ''}</td>

      </tr>
    `, this)}
    </table>
    `
  }

  _handleClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `event/${grampsId}`
  }

}

window.customElements.define('grampsjs-events', GrampsjsEvents)


