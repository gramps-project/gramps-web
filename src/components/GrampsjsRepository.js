import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'


export class GrampsjsRepository extends GrampsjsObject {
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
    <h2>${this.data.name}</h2>
    ${this.data?.type ? html`<p><span class="md">${this._("Type")}:</span> ${this._(this.data.type)}</p>` : ''}
    `;
  }

}


window.customElements.define('grampsjs-repository', GrampsjsRepository);
