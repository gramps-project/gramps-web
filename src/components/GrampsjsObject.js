import { LitElement, css, html } from 'lit-element';

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import { sharedStyles } from '../SharedStyles.js';
import './GrampsjsTags.js';
import './GrampsjsAttributes.js';
import './GrampsjsAddresses.js';

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

      pre {
        max-width: 80%;
        font-size: 11px;
      }

      .tab-content {
        margin-top: 25px;
      }

      mwc-tab-bar {
        border-top: solid #6D4C4133 1px;
        border-bottom: solid #6D4C4133 1px;
        margin-top: 15px;
        --mdc-tab-horizontal-padding: 16px;
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

    ${this.renderTags()}

    ${this.renderTabs()}

    <div class="tab-content">
      ${this.renderTabContent()}
    </div>
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

  renderTags() {
    if (!('extended' in this.data)) {
      return html``
    }
    if (!('tags' in this.data.extended)) {
      return html``
    }
    return html`<grampsjs-tags .data=${this.data.extended.tags}></grampsjs-tags>`
  }

  renderTabContent() {
    switch(this._currentTab) {
      case("event_ref_list"):
        return html`<pre>${JSON.stringify(this.data.extended.events, null, 2)}</pre>`
      case("citation_list"):
        return html`<pre>${JSON.stringify(this.data.extended.citations, null, 2)}</pre>`
      case("attribute_list"):
        return html`<grampsjs-attributes .strings=${this.strings} .data=${this.data.attribute_list}></grampsjs-attributes>`
      case("address_list"):
        return html`<grampsjs-addresses .strings=${this.strings} .data=${this.data.address_list}></grampsjs-addresses>`
      case("note_list"):
        return html`<pre>${JSON.stringify(this.data.extended.notes, null, 2)}</pre>`
      case("media_list"):
        return html`<pre>${JSON.stringify(this.data.extended.media, null, 2)}</pre>`
      case("urls"):
        return html`<pre>${JSON.stringify(this.data.urls, null, 2)}</pre>`
      case("person_ref_list"):
        return html`<pre>${JSON.stringify(this.data.extended.people, null, 2)}</pre>`
      case("backlinks"):
        return html`<pre>${JSON.stringify(this.data.extended.backlinks, null, 2)}</pre>`
      default:
        break
    }
    return html``
  }

  _getTabs() {
    return Object.keys(_allTabs).filter(key => key in this.data && Object.keys(this.data[key]).length > 0)
  }

  _makeTab(key) {
    return html`
    <mwc-tab
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

