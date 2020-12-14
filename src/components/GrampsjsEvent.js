import {html, css} from 'lit-element'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'


export class GrampsjsEvent extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }

  renderProfile() {
    return html`
    <h2><mwc-icon class="person">event</mwc-icon> ${this.data.description}</h2>
    ${this.data?.profile?.type ? html`<p>${this.data.profile.type}</p>` : ''}
    <p>
      ${this.data?.profile?.date ? html`${this.data.profile.date}` : ''}
      ${this.data?.profile?.place ? html`
        ${this._('in')} <a href="/place/${this.data.extended.place.gramps_id}">${this.data.profile.place}</a>` : ''}
    </p>
    `
  }

}


window.customElements.define('grampsjs-event', GrampsjsEvent)
