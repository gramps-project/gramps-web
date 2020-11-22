import { LitElement, css, html } from 'lit-element';

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import { sharedStyles } from '../SharedStyles.js';


export class GrampsjsObject extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
      }
      `
    ];
  }

  static get properties() {
    return {
      data: { type: Object },
      strings: { type: Object },
    };
  }

  constructor() {
    super();
    this.data = {};
    this.strings = {};
  }


  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
    ${this.renderProfile()}

    ${this.renderTabs()}
    `;
  }

  renderTabs() {
    return html`
    <mwc-tab-bar>
      ${this._makeTab('family_list', 'Relationships')}
      ${this._makeTab('placeref_list', 'Enclosed by')}
      ${this._makeTab('primary_name', 'Names')}
      ${this._makeTab('event_ref_list', 'Events')}
      ${this._makeTab('citation_list', 'Citations')}
      ${this._makeTab('attribute_list', 'Attributes')}
      ${this._makeTab('address_list', 'Addresses')}
      ${this._makeTab('note_list', 'Notes')}
      ${this._makeTab('media_list', 'Gallery')}
      ${this._makeTab('urls', 'Internet')}
      ${this._makeTab('person_ref_list', 'Associations')}
      ${this._makeTab('backlinks', 'References')}
    </mwc-tab-bar>
    `
  }

  _makeTab(key, label) {
    if (key in this.data) {
      return html`
      <mwc-tab
        isMinWidthIndicator
        label="${this._(label)}"
        @click="${this._handleTabClick}">
      </mwc-tab>
      `
    }
    return ''

  }

  _handleTabClick(event) {
    console.log(event)
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

