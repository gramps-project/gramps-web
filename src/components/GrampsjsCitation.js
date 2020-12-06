import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'


export class GrampsjsCitation extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `];
  }


  renderProfile() {
    return html`
    ${this.data?.extended?.source?.title ? html`<p><span class="md">${this._("Source")}:</span> ${this.data.extended.source.title}</p>` : ''}
    ${this.data?.page ? html`<p><span class="md">${this._("Page")}:</span> ${this.data.page}</p>` : ''}
    `;
  }

  renderPicture() {
    return ''
  }


}


window.customElements.define('grampsjs-citation', GrampsjsCitation);
