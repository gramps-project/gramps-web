import { html, css } from 'lit-element';

import '@vaadin/vaadin-grid/theme/material/vaadin-grid.js'

import { GrampsjsView } from './GrampsjsView.js'
import { apiGet } from '../api.js'


export class GrampsjsViewPeople extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }

      vaadin-grid {
        max-height: calc(100vh - 190px);
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
    <vaadin-grid .items="${this._data}" @click="${this._handleGridClick}">
      <vaadin-grid-column path="grampsId" header="Gramps ID"></vaadin-grid-column>
      <vaadin-grid-column path="surname" header="Surname"></vaadin-grid-column>
      <vaadin-grid-column path="given" header="Given name"></vaadin-grid-column>
      <vaadin-grid-column path="birth" header="Birthdate"></vaadin-grid-column>
      <vaadin-grid-column path="death" header="Death date"></vaadin-grid-column>
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
      this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {page: `person/${item.grampsId}`}}));
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _formatRow(row) {
    const formattedRow = {
      grampsId: row.gramps_id,
      surname: row?.profile?.name_surname,
      given: row?.profile?.name_given,
      birth: row?.profile?.birth?.date,
      death: row?.profile?.death?.date,
    }
    return formattedRow
  }

  _fetchData() {
    apiGet(`/api/people/?profile`).then(data => {
      if ('data' in data && data.data.length) {
        this._data = data.data.map(this._formatRow)
      }
    })
  }
}


window.customElements.define('grampsjs-view-people', GrampsjsViewPeople);
