import { html } from 'lit-element';


import { GrampsjsView } from './GrampsjsView.js'
import '../components/GrampsjsSearchResults.js'


export class GrampsjsViewRecentObject extends GrampsjsView {

  static get properties() {
    return {
      _data: { type: Array },
    };
  }

  constructor() {
    super();
    this._data = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._boundHandleEvent = this._handleEvent.bind(this);
    window.addEventListener('object:loaded', this._boundHandleEvent);
  }

  _handleEvent(event) {
    this._data.push(event.detail)
  }

  render() {
    if (this._data.length === 0) {
      return html`Hallo`
    }
    return html`
    <pre>${JSON.stringify(this._data, null, 2)}</pre>
    `;
  }
}


window.customElements.define('grampsjs-view-recent', GrampsjsViewRecentObject);
