import {html} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'

const BASE_DIR = ''

export class GrampsjsPlace extends GrampsjsObject {

  renderProfile() {
    return html`
    <h2><mwc-icon class="person">place</mwc-icon> ${this.data?.name?.value || this.data.title || this._('Place')}</h2>

    ${this.data?.profile?.parent_places.length > 0 ? html`
    <dl>
      ${this.data.profile.parent_places.map((obj) => html`
      <div>
        <dt>
          ${obj.type}
        </dt>
        <dd>
          <a href="${BASE_DIR}/place/${obj.gramps_id}">${obj.name}</a>
        </dd>
      </div>
`)}
    </dl>
    ` : ''}
    `
  }

}


window.customElements.define('grampsjs-place', GrampsjsPlace)
