import {css, html} from 'lit'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'

function _formatName(person) {
  const first = person?.primary_name?.first_name || ''
  const surnameList = person?.primary_name?.surname_list || []
  const last = (surnameList.length === 0 ? '' :  surnameList[0]?.surname || '')
  return `${first} ${last}`
}

export class GrampsjsAssociations extends GrampsjsTableBase {

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
      extended: {type: Array}
    }
  }

  render() {
    if (Object.keys(this.data).length === 0 || Object.keys(this.extended).length === 0) {
      return html``
    }
    return html`
    <table>
      <tr>
        <th>${this._('Name')}</th>
        <th>${this._('Association')}</th>
      </tr>
    ${this.data.map((obj, i) => html`
      <tr @click=${() => this._handleClick(this.extended[i].gramps_id)}>
        <td>${_formatName(this.extended[i])}</td>
        <td>${obj.rel}</td>
      </tr>
    </table>
    `)}
    `
  }

  _handleClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `person/${grampsId}`
  }
}


window.customElements.define('grampsjs-associations', GrampsjsAssociations)


