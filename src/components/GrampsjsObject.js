import {LitElement, css, html} from 'lit-element'

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import {sharedStyles} from '../SharedStyles.js'
import '../views/GrampsjsViewObjectNotes.js'
import '../views/GrampsjsViewSourceCitations.js'
import './GrampsjsAddresses.js'
import './GrampsjsAttributes.js'
import './GrampsjsChildren.js'
import './GrampsjsEvents.js'
import './GrampsjsGallery.js'
import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'
import './GrampsjsParticipants.js'
import './GrampsjsReferences.js'
import './GrampsjsRelationships.js'
import './GrampsjsTags.js'
import './GrampsjsUrls.js'


/*
Define all tabs in the object view, their details, and when to display them
(we do not display empty tabs)
*/

const _allTabs = {
  relationships: {title: 'Relationships', condition: (data) => (data.family_list?.length > 0 || data.parent_family_list?.length > 0)},
  map: {title: 'Map', condition: (data) => (data?.profile?.lat !== undefined && data?.profile?.lat !== null &&(data?.profile?.lat !== 0 || data?.profile?.long !== 0))},
  children: {title: 'Children', condition: (data) => (data.child_ref_list?.length > 0)},
  events: {title: 'Events', condition: (data) => (data?.event_ref_list?.length > 0)},
  names: {title: 'Names', condition: (data) => (data?.primary_name?.length > 0)},
  participants: {title: 'Participants', condition: (data) => (data?.profile?.participants?.people?.length || data?.profile?.participants?.families?.length)},
  gallery: {title: 'Gallery', condition: (data) => (data?.media_list?.length > 0)},
  notes: {title: 'Notes', condition: (data) => (data?.note_list?.length > 0)},
  citations: {title: 'Sources', condition: (data) => (data?.citation_list?.length > 0)},
  attributes: {title: 'Attributes', condition: (data) => (data?.attribute_list?.length > 0)},
  addresses: {title: 'Addresses', condition: (data) => (data?.address_list?.length > 0)},
  internet: {title: 'Internet', condition: (data) => (data?.urls?.length > 0)},
  associations: {title: 'Associations', condition: (data) => (data?.person_ref_list?.length > 0)},
  references: {title: 'References', condition: (data) => (Object.keys(data?.backlinks)?.length > 0)}
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
      `
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      strings: {type: Object},
      _currentTabId: {type: Number},
      _currentTab: {type: String},
      _showReferences: {type: Boolean}
    }
  }

  constructor() {
    super()
    this.data = {}
    this.strings = {}
    this._currentTabId = 0
    this._showReferences = true
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
        path: `media/${grampsId}`
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
      return html`<grampsjs-relationships
          grampsId="${this.data.gramps_id}"
          .strings=${this.strings}
          .familyList=${this.data?.extended?.family_list || []}
          .families=${this.data?.profile?.families || []}
          .primaryParentFamily=${this.data?.profile?.primary_parent_family || {}}
          .otherParentFamilies=${this.data?.profile?.other_parent_families || []}
          ></grampsjs-relationships>`
    case('map'):
      return html`<grampsjs-map
          latitude="${this.data.profile.lat}"
          longitude="${this.data.profile.long}"
          mapid="place-map"
          id="map"
          >
            <grampsjs-map-marker
            latitude="${this.data.profile.lat}"
            longitude="${this.data.profile.long}"
            >
            </grampsjs-map-marker>
          </grampsjs-map>`
    case('events'):
      return html`<grampsjs-events .strings=${this.strings} .data=${this.data?.extended?.events} .profile=${this.data?.profile?.events}></grampsjs-events>`
    case('children'):
      return html`<grampsjs-children .strings=${this.strings} .data=${this.data?.child_ref_list} .profile=${this.data?.profile?.children}></grampsjs-children>`
    case('citations'):
      return html`<grampsjs-view-source-citations active .strings=${this.strings} .grampsIds=${(this.data?.extended?.citations || []).map(obj => obj.gramps_id).filter(obj => Boolean(obj))}></grampsjs-view-source-citations>`
    case('attributes'):
      return html`<grampsjs-attributes .strings=${this.strings} .data=${this.data.attribute_list}></grampsjs-attributes>`
    case('addresses'):
      return html`<grampsjs-addresses .strings=${this.strings} .data=${this.data.address_list}></grampsjs-addresses>`
    case('notes'):
      return html`<grampsjs-view-object-notes active .strings=${this.strings} .grampsIds=${(this.data?.extended?.notes || []).map(obj => obj.gramps_id).filter(obj => Boolean(obj))}></grampsjs-view-object-notes>`
    case('gallery'):
      return html`<grampsjs-gallery .strings=${this.strings} .media=${this.data?.extended?.media} .mediaRef=${this.data?.media_list}></grampsjs-gallery>`
    case('internet'):
      return html`<grampsjs-urls .strings=${this.strings} .data=${this.data.urls}></grampsjs-urls>`
    case('associations'):
      return html`<pre>${JSON.stringify(this.data.extended.people, null, 2)}</pre>`
    case('participants'):
      return html`<grampsjs-participants .strings=${this.strings} .data=${[this.data?.profile?.participants]}></grampsjs-participants>`
    case('references'):
      return html`<grampsjs-references .strings=${this.strings} .data=${[this.data?.extended?.backlinks]} .profile=${this.data?.profile?.references || {}}></grampsjs-references>`
    default:
      break
    }
    return html``
  }

  _getTabs() {
    return Object.keys(_allTabs).filter(key => (_allTabs[key].condition(this.data) && (this._showReferences || key !== 'references')))
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

