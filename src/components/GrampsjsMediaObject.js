import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'


export class GrampsjsMediaObject extends GrampsjsObject {
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
    <pre style="max-width:100%;">${JSON.stringify(this.data, null, 2)}</pre>
    `;
  }

}


window.customElements.define('grampsjs-media-object', GrampsjsMediaObject);
