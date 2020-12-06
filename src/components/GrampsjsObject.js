import { LitElement, css, html } from 'lit-element';

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import { sharedStyles } from '../SharedStyles.js';
import './GrampsjsAddresses.js';
import './GrampsjsAttributes.js';
import './GrampsjsEvents.js';
import './GrampsjsChildren.js';
import './GrampsjsReferences.js';
import './GrampsjsTags.js';
import './GrampsjsUrls.js';
import './GrampsjsGallery.js';

const _allTabs = {
  family_list: 'Relationships',
  child_ref_list: 'Children',
  placeref_list: 'Enclosed by',
  event_ref_list: 'Events',
  primary_name: 'Names',
  media_list: 'Gallery',
  note_list: 'Notes',
  citation_list: 'Citations',
  attribute_list: 'Attributes',
  address_list: 'Addresses',
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
        padding-bottom: 3em;
      }

      #tabs {
        clear: both;
        margin-top: 30px;
      }

      mwc-tab-bar {
        border-bottom: solid #6D4C4133 1px;
        margin-top: 36px;
        margin-bottom: 36px;
        --mdc-tab-horizontal-padding: 16px;
      }

      #picture {
        float: right;
        margin-bottom: 20px;
        margin-left: 40px;
      }

      .event {
        margin-right: 1em;
      }

      .event i svg path {
        fill: #999999;
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
    <div id="picture">
    ${this.renderPicture()}
    </div>

    ${this.renderProfile()}

    ${this.renderTags()}

    <div id="tabs">
    ${this.renderTabs()}
    </div>

    <div class="tab-content">
      ${this.renderTabContent()}
    </div>
    `;
  }


  renderPicture() {
    if (!this.data?.media_list?.length) {
      return html``
    }
    const ref = this.data.media_list[0]
    const obj = this.data.extended.media[0]
    return html`
      <grampsjs-img
        handle="${obj.handle}"
        size="200"
        displayHeight="200"
      .rect="${ref.rect || []}"
        square
        circle
        mime="${obj.mime}"
      ></grampsjs-img>
    `
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
        return html`<grampsjs-events .strings=${this.strings} .data=${this.data?.extended?.events} .profile=${this.data?.profile?.events}></grampsjs-events>`
      case("child_ref_list"):
        return html`<grampsjs-children .strings=${this.strings} .data=${this.data?.child_ref_list} .profile=${this.data?.profile?.children}></grampsjs-children>`
      case("citation_list"):
        return html`<pre>${JSON.stringify(this.data.extended.citations, null, 2)}</pre>`
      case("attribute_list"):
      return html`<grampsjs-attributes .strings=${this.strings} .data=${this.data.attribute_list}></grampsjs-attributes>`
      case("address_list"):
        return html`<grampsjs-addresses .strings=${this.strings} .data=${this.data.address_list}></grampsjs-addresses>`
      case("note_list"):
        return html`<pre>${JSON.stringify(this.data.extended.notes, null, 2)}</pre>`
      case("media_list"):
        return html`<grampsjs-gallery .strings=${this.strings} .media=${this.data?.extended?.media} .mediaRef=${this.data?.media_list}></grampsjs-gallery>`
      case("urls"):
        return html`<grampsjs-urls .strings=${this.strings} .data=${this.data.urls}></grampsjs-urls>`
      case("person_ref_list"):
        return html`<pre>${JSON.stringify(this.data.extended.people, null, 2)}</pre>`
      case("backlinks"):
        return html`<grampsjs-references .strings=${this.strings} .data=${[]}></grampsjs-references>`
      default:
        break
    }
    return html`Missing: ${this._currentTab}`
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

