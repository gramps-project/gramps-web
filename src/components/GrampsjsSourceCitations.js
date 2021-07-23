import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'


export class GrampsjsSourceCitations extends GrampsjsTableBase {


  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
    <table class="linked">
      <tr>
        <th>${this._('Page')}</th>
        <th>${this._('Source: Title')}</th>
        <th>${this._('Source: Author')}</th>
        <th></th>
        <th></th>
      </tr>
    ${this.data.map(obj => html`
      <tr
        @click=${() => this._handleClick(obj.gramps_id)}>
        <td>${obj.profile?.page || ''}</td>
        <td>${obj.profile?.source?.title || ''}</td>
        <td>${obj.profile?.source?.author || ''}</td>
        <td>${obj?.media_list?.length > 0 || obj?.extended?.source?.media_list > 0 ? html`
          <mwc-icon class="inline">photo</mwc-icon>` : ''}
      ${obj?.note_list?.length > 0 || obj?.extended?.source?.note_list > 0 ? html`
          <mwc-icon class="inline">sticky_note_2</mwc-icon>` : ''}</td>
      </tr>
    `)}
    </table>
    `
  }


  _handleClick(grampsId) {
    if (grampsId !== this.grampsId) {
      this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `citation/${grampsId}`
  }
}


window.customElements.define('grampsjs-source-citations', GrampsjsSourceCitations)


