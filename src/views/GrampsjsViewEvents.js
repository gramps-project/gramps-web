/*
Events list view
*/


import { html, css } from 'lit-element';

import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'


export class GrampsjsViewEvents extends GrampsjsView {
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
      <vaadin-grid-column path="grampsId" header="${this._('Gramps ID')}"></vaadin-grid-column>
      <vaadin-grid-column path="type" header="${this._('Event Type')}"></vaadin-grid-column>
      <vaadin-grid-column path="date" header="${this._('Date')}"></vaadin-grid-column>
      <vaadin-grid-column path="place" header="${this._('Place')}"></vaadin-grid-column>
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
      this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: `event/${item.grampsId}`}}));
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      type: row?.profile?.type,
      date: row?.profile?.date,
      place: row?.profile?.place
    }
    return formattedRow
  }

  _fetchData() {
    this.loading = true;
    apiGet(`/api/events/?profile=self&keys=gramps_id,profile`).then(data => {
      this.loading = false;
      if ('data' in data) {
        this._data = data.data.map((row) => this._formatRow(row))
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }
}


window.customElements.define('grampsjs-view-events', GrampsjsViewEvents);
