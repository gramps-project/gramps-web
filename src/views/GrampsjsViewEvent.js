import { html, css } from 'lit-element';

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'


export class GrampsjsViewEvent extends GrampsjsView {
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


  renderContent() {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return html`
    Event view ${this.grampsId}
    `;

  }

  update(changed) {
    super.update(changed);
    if (this.active && changed.has('grampsId')) {
        this._updateData()
    }
  }

  _updateData() {
    if (this.grampsId !== undefined && this.grampsId) {
      this._data = {}
      this.loading = true
      apiGet(`/api/events/?gramps_id=${this.grampsId}&profile=self`).then(data => {
        this.loading = false;
        if ('data' in data) {
          [this._data] = data.data;
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }
}


window.customElements.define('grampsjs-view-event', GrampsjsViewEvent);
