import {LitElement, css, html} from 'lit-element'

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsAddresses.js'
import './GrampsjsAttributes.js'
import './GrampsjsEvents.js'
import './GrampsjsFamilies.js'
import './GrampsjsChildren.js'
import './GrampsjsReferences.js'
import './GrampsjsTags.js'
import './GrampsjsUrls.js'
import './GrampsjsGallery.js'
import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'


/*
Define all tabs in the object view, their details, and when to display them
(we do not display empty tabs)
*/

const _allTabs = {
  relationships: {title: 'Relationships', condition: (data) => (data.family_list?.length > 0 || data.parent_family_list?.length > 0)},
  map: {title: 'Map', condition: (data) => (data?.profile?.lat !== undefined && data?.profile?.lat !== null)},
  children: {title: 'Children', condition: (data) => (data.child_ref_list?.length > 0)},
  placeref_list: {title: 'Enclosed by', condition: (data) => (data?.placeref_list?.length > 0)},
  events: {title: 'Events', condition: (data) => (data?.event_ref_list?.length > 0)},
  names: {title: 'Names', condition: (data) => (data?.primary_name?.length > 0)},
  gallery: {title: 'Gallery', condition: (data) => (data?.media_list?.length > 0)},
  notes: {title: 'Notes', condition: (data) => (data?.note_list?.length > 0)},
  citations: {title: 'Citations', condition: (data) => (data?.citation_list?.length > 0)},
  attributes: {title: 'Attributes', condition: (data) => (data?.attribute_list?.length > 0)},
  addresses: {title: 'Addresses', condition: (data) => (data?.address_list?.length > 0)},
  internet: {title: 'Internet', condition: (data) => (data?.urls?.length > 0)},
  associations: {title: 'Associations', condition: (data) => (data?.person_ref_list?.length > 0)},
  references: {title: 'References', condition: (data) => (data?.backlinks?.length > 0)}
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
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      strings: {type: Object},
      _currentTabId: {type: Number},
      _currentTab: {type: String},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.strings = {}
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
    `
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
        @click="${() => this._handleImgClick(obj.gramps_id)}"
        class="link"
      ></grampsjs-img>
    `
  }

  _handleImgClick(grampsId) {
    this.dispatchEvent(new CustomEvent('nav', {
      bubbles: true, composed: true, detail: {
        path: `mediaobject/${grampsId}`
      }
    }))
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
    case('relationships'):
      return html`<grampsjs-families
          grampsId="${this.data.gramps_id}"
          .strings=${this.strings}
          .familyList=${this.data?.extended?.families || []}
          .families=${this.data?.profile?.families || []}
          .primaryParentFamily=${this.data?.profile?.primary_parent_family || {}}
          .otherParentFamilies=${this.data?.profile?.other_parent_families || []}
          ></grampsjs-families>`
    case('map'):
      return html`<grampsjs-map
          latitude=${this.data.profile.lat}
          longitude=${this.data.profile.long}
          >
            <grampsjs-map-marker>
            latitude=${this.data.profile.lat}
            longitude=${this.data.profile.long}
            >
            </grampsjs-map-marker>
          </grampsjs-map>`
    case('events'):
      return html`<grampsjs-events .strings=${this.strings} .data=${this.data?.extended?.events} .profile=${this.data?.profile?.events}></grampsjs-events>`
    case('children'):
      return html`<grampsjs-children .strings=${this.strings} .data=${this.data?.child_ref_list} .profile=${this.data?.profile?.children}></grampsjs-children>`
    case('citations'):
      return html`<pre>${JSON.stringify(this.data.extended.citations, null, 2)}</pre>`
    case('attributes'):
      return html`<grampsjs-attributes .strings=${this.strings} .data=${this.data.attribute_list}></grampsjs-attributes>`
    case('addresses'):
      return html`<grampsjs-addresses .strings=${this.strings} .data=${this.data.address_list}></grampsjs-addresses>`
    case('notes'):
      return html`<pre>${JSON.stringify(this.data.extended.notes, null, 2)}</pre>`
    case('gallery'):
      return html`<grampsjs-gallery .strings=${this.strings} .media=${this.data?.extended?.media} .mediaRef=${this.data?.media_list}></grampsjs-gallery>`
    case('internet'):
      return html`<grampsjs-urls .strings=${this.strings} .data=${this.data.urls}></grampsjs-urls>`
    case('associations'):
      return html`<pre>${JSON.stringify(this.data.extended.people, null, 2)}</pre>`
    case('references'):
      return html`<grampsjs-references .strings=${this.strings} .data=${[this.data?.extended?.backlinks]}></grampsjs-references>`
    default:
      break
    }
    return html`Missing: ${this._currentTab}`
  }

  _getTabs() {
    return Object.keys(_allTabs).filter(key => _allTabs[key].condition(this.data))
  }

  _makeTab(key) {
    return html`
    <mwc-tab
      id="${key}"
      label="${this._(_allTabs[key].title)}"
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

