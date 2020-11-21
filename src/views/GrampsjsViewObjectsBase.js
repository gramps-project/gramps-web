/*
Base view for lists of Gramps objects, e.g. people, events, ...
*/


import { html, css } from 'lit-element';

import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'


export class GrampsjsViewObjectsBase extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }

      vaadin-grid {
        max-height: calc(100vh - 190px);
      }

      vaadin-grid {
        font-family: Roboto;
        font-weight: 300;
      }
    `];
  }


  static get properties() {
    return {
      _data: { type: Array },
      _columns: { type: Object },
      _fetchUrl: {type: String},
    };
  }

  constructor() {
    super();
    this._data = [];
  }

  renderContent() {
    if (this._data.length === 0) {
      return html``
    }
    return html`
    <vaadin-grid .items="${this._data}" @click="${this._handleGridClick}">
      ${Object.keys(this._columns).map((column) => html`
        <vaadin-grid-column path="${column}" header="${this._(this._columns[column])}">
        </vaadin-grid-column>
      `)}
    </vaadin-grid>
    `;

  }

  firstUpdated() {
    this._fetchData()
  }

  _handleGridClick(e) {
    const grid = e.currentTarget;
    const {item} = grid.getEventContext(e);
    if (item.grampsId){
      this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(item)}}));
    }
  }

  _fetchData() {
    this.loading = true;
    apiGet(this._fetchUrl).then(data => {
      this.loading = false;
      if ('data' in data) {
        this._data = data.data.map((row) => this._formatRow(row))
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow() {
    return {}
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(item) {
    return ''
  }

}
