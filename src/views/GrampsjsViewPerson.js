import { html, css } from 'lit-element';

import { GrampsjsView } from './GrampsjsView.js'
import '../components/GrampsjsPerson.js'
import { apiGet } from '../api.js'


export class GrampsjsViewPerson extends GrampsjsView {
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
      grampsId: { type: String },
      _data: { type: Object },
    };
  }


  constructor() {
    super();
    this._data = {};
  }


  render() {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return html`
    Person view ${this.grampsId}:
    <grampsjs-person .data=${this._data} .strings=${this.strings}></grampsjs-person>
    `;

  }

  update(changed) {
    super.update(changed);
    if (changed.has('grampsId')) {
        this._updateData()
    }
  }

  _updateData() {
    if (this.grampsId !== undefined && this.grampsId) {
      this._data = {}
      this.loading = true
      apiGet(`/api/people/?gramps_id=${this.grampsId}&profile`).then(data => {
        if ('data' in data && data.data.length) {
          this.loading = false;
          [this._data] = data.data;
        }
      })
    }
  }
}


window.customElements.define('grampsjs-view-person', GrampsjsViewPerson);
