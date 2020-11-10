import { html, css } from 'lit-element';

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'


export class GrampsjsViewPeople extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `];
  }


  static get properties() {
    return {
      _data: { type: Array },
    };
  }


  constructor() {
    super();
    this._data = [];
  }


  render() {
    if (this._data.length === 0) {
      return html`Loading ...`
    }
    return html`
    <h2>People view</h2>
    <ul>
    ${this._data.map((element) => {
      return html`<li><a href="/person/${element.gramps_id}">${element.gramps_id}</a></li>`
    })}
    </ul>
    `;

  }

  firstUpdated() {
    apiGet(`/api/people/?profile`).then(data => {
      if ('data' in data && data.data.length) {
        this._data = data.data;
      }
    })
  }
}


window.customElements.define('grampsjs-view-people', GrampsjsViewPeople);
