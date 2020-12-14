import {html, css} from 'lit-element'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'


export class GrampsjsPlace extends GrampsjsObject {

  renderProfile() {
    return html`
    <h2><mwc-icon class="person">place</mwc-icon> ${this.data.title}</h2>
    <pre style="max-width:100%;">${JSON.stringify(this.data, null, 2)}</pre>
    `
  }

}


window.customElements.define('grampsjs-place', GrampsjsPlace)
