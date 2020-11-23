import { LitElement, css, html } from 'lit-element';

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import { sharedStyles } from '../SharedStyles.js';

const _allTabs = {
  family_list: 'Relationships',
  placeref_list: 'Enclosed by',
  primary_name: 'Names',
  event_ref_list: 'Events',
  citation_list: 'Citations',
  attribute_list: 'Attributes',
  address_list: 'Addresses',
  note_list: 'Notes',
  media_list: 'Gallery',
  urls: 'Internet',
  person_ref_list: 'Associations',
  backlinks: 'References'
}

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
      _currentTabId: {type: Number},
      _currentTab: {type: String},
    };
  }

  constructor() {
    super();
    this.data = {};
    this.strings = {};
    this._currentTabId = 0
  }


  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
    ${this.renderProfile()}

    ${this.renderTabs()}

    ${this.renderTabContent()}
    `;
  }

  renderTabs() {
    const tabKeys = this._getTabs()
    if (!tabKeys.includes(this._currentTab)) {
      [this._currentTab] = tabKeys
    }
    return html`
    <mwc-tab-bar
      .activeIndex=${this._currentTabId}
      @MDCTabBar:activated=${this._handleTabActivated}
      @MDCTab:interacted=${this._handleTabInteracted}
      id="tab-bar">
      ${tabKeys.map(key => this._makeTab(key))}
    </mwc-tab-bar>
    `
  }

  renderTabContent() {
    return html`
    ${this._currentTab}
    `
  }

  _getTabs() {
    return Object.keys(_allTabs).filter(key => key in this.data)
  }

  _makeTab(key) {
    return html`
    <mwc-tab
      isMinWidthIndicator
      id="${key}"
      label="${this._(_allTabs[key])}"
      >
    </mwc-tab>
    `
  }


  _handleTabActivated (event) {
    this._currentTabId = event.detail.index
  }

  _handleTabInteracted (event) {
    this._currentTab = event.detail.tabId
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

