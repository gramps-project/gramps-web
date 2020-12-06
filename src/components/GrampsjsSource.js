import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'


export class GrampsjsSource extends GrampsjsObject {
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
    <h2>${this.data.title}</h2>
    ${this.data?.abbrev ? html`<p><span class="md">${this._("Abbreviation")}:</span> ${this.data.abbrev}</p>` : ''}
    ${this.data?.author ? html`<p><span class="md">${this._("Author")}:</span> ${this.data.author}</p>` : ''}
    ${this.data?.pubinfo ? html`<p><span class="md">${this._("Publication info")}:</span> ${this.data.pubinfo}</p>` : ''}
    `;
  }

  renderPicture() {
    return ''
  }

}


window.customElements.define('grampsjs-source', GrampsjsSource);
