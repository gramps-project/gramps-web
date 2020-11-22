import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'


export class GrampsjsPlace extends GrampsjsObject {
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

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = this.data.profile.name_surname || 'NN';
    const given = this.data.profile.name_given || 'NN';
    return html`${surname}, ${given}`
  }

  _getProfileEvent(type) {
    if (!(this.data.profile && this.data.profile.events)) {
      return '';
    }
    for (const event of this.data.profile.events) {
      if (event.type === type) {
        return html`${event.date} ${this._('in')} ${event.place}`
      }
    }
    return '';
  }

}


window.customElements.define('grampsjs-place', GrampsjsPlace);
