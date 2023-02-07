/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
import {LitElement, css, html} from 'lit'

import '@material/mwc-tab'
import '@material/mwc-tab-bar'

import {sharedStyles} from '../SharedStyles.js'
import '../views/GrampsjsViewObjectNotes.js'
import '../views/GrampsjsViewSourceCitations.js'
import '../views/GrampsjsViewPersonTimeline.js'
import './GrampsjsAddresses.js'
import './GrampsjsAssociations.js'
import './GrampsjsAttributes.js'
import './GrampsjsChildren.js'
import './GrampsjsCitations.js'
import './GrampsjsEvents.js'
import './GrampsjsNames.js'
import './GrampsjsPlaceChildren.js'
import './GrampsjsPlaceRefs.js'
import './GrampsjsGallery.js'
import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'
import './GrampsjsParticipants.js'
import './GrampsjsPrivacy.js'
import './GrampsjsReferences.js'
import './GrampsjsRelationships.js'
import './GrampsjsRepositories.js'
import './GrampsjsSources.js'
import './GrampsjsTags.js'
import './GrampsjsUrls.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

import {fireEvent} from '../util.js'
import {getMediaUrl} from '../api.js'

/*
Define all tabs in the object view, their details, and when to display them
(we do not display empty tabs)
*/

const _allTabs = {
  relationships: {
    title: 'Relationships',
    condition: data =>
      data.family_list?.length > 0 || data.parent_family_list?.length > 0,
    conditionEdit: () => false,
  },
  names: {
    title: '_Names',
    condition: data => 'primary_name' in data,
    conditionEdit: data => 'primary_name' in data,
  },
  enclosed: {
    title: 'Place Hierarchy',
    condition: data =>
      data.placeref_list?.length > 0 ||
      ('placeref_list' in data && data?.backlinks?.place?.length >= 0),
    conditionEdit: data => 'placeref_list' in data,
  },
  map: {
    title: 'Map',
    condition: data =>
      (data?.profile?.lat !== undefined &&
        data?.profile?.lat !== null &&
        (data?.profile?.lat !== 0 || data?.profile?.long !== 0)) ||
      (data.attribute_list || []).filter(attr => attr.type === 'map:bounds')
        .length > 0,
    conditionEdit: data =>
      'lat' in data || ('mime' in data && data.mime.startsWith('image')),
  },
  children: {
    title: 'Children',
    condition: data => data.child_ref_list?.length > 0,
    conditionEdit: data => 'child_ref_list' in data,
  },
  sources: {
    title: 'Sources',
    condition: data => data?.backlinks?.source?.length > 0 && 'name' in data,
    conditionEdit: data => false,
  },
  events: {
    title: 'Events',
    condition: data => data?.event_ref_list?.length > 0,
    conditionEdit: data => 'event_ref_list' in data,
  },
  placeEvents: {
    title: 'Events',
    condition: data =>
      'placeref_list' in data && data?.backlinks?.event?.length > 0,
    conditionEdit: data => false,
  },
  timeline: {
    title: 'Timeline',
    condition: data => data?.event_ref_list?.length > 0,
    conditionEdit: () => false,
  },
  participants: {
    title: 'Participants',
    condition: data =>
      data?.profile?.participants?.people?.length ||
      data?.profile?.participants?.families?.length,
    conditionEdit: data => false,
  },
  gallery: {
    title: 'Gallery',
    condition: data => data?.media_list?.length > 0,
    conditionEdit: data => 'media_list' in data,
  },
  notes: {
    title: 'Notes',
    condition: data => data?.note_list?.length > 0,
    conditionEdit: data => 'note_list' in data,
  },
  sourceCitations: {
    title: 'Sources',
    condition: data => data?.citation_list?.length > 0,
    conditionEdit: data => 'citation_list' in data,
  },
  citations: {
    title: 'Citations',
    condition: data =>
      data?.backlinks?.citation?.length > 0 && 'abbrev' in data,
    conditionEdit: data => false,
  },
  attributes: {
    title: 'Attributes',
    condition: data => data?.attribute_list?.length > 0,
    conditionEdit: data => 'attribute_list' in data,
  },
  addresses: {
    title: 'Addresses',
    condition: data => data?.address_list?.length > 0,
    conditionEdit: data => false, // 'address_list' in data // FIXME editable in principle but UI not implemented
  },
  internet: {
    title: 'Internet',
    condition: data => data?.urls?.length > 0,
    conditionEdit: data => 'urls' in data,
  },
  associations: {
    title: 'Associations',
    condition: data => data?.person_ref_list?.length > 0,
    conditionEdit: data => false, // 'person_ref_list' in data // FIXME editable in principle but UI not implemented
  },
  repositories: {
    title: 'Repositories',
    condition: data => data?.reporef_list?.length > 0,
    conditionEdit: data => 'reporef_list' in data,
  },
  references: {
    title: 'References',
    condition: data => Object.keys(data?.backlinks)?.length > 0,
    conditionEdit: data => false,
  },
}

export class GrampsjsObject extends GrampsjsTranslateMixin(LitElement) {
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
          border-bottom: solid #6d4c4133 1px;
          margin-top: 28px;
          margin-bottom: 36px;
          --mdc-tab-horizontal-padding: 16px;
        }

        #picture {
          margin-bottom: 20px;
          position: relative;
          text-align: center;
        }

        @media (min-width: 768px) {
          #picture {
            float: right;
            text-align: right;
            margin-left: 40px;
            margin-right: 0px;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      edit: {type: Boolean},
      canEdit: {type: Boolean},
      dialogContent: {type: String},
      _currentTabId: {type: Number},
      _currentTab: {type: String},
      _showReferences: {type: Boolean},
      _showPersonTimeline: {type: Boolean},
      _showFamilyTimeline: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.edit = false
    this.canEdit = false
    this.dialogContent = ''
    this._currentTabId = 0
    this._showReferences = true
    this._showPersonTimeline = false
    this._showFamilyTimeline = false
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
      <div id="picture">
        ${this.renderPicture()}
        <div id="privacy">${this.renderPrivacy()}</div>
      </div>

      ${this.renderProfile()}

      <div style="clear:left;"></div>

      ${this.renderBeforeTags()} ${this.renderTags()}

      <div id="tabs">${this.renderTabs()}</div>

      <div class="tab-content">${this.renderTabContent()}</div>

      ${this.dialogContent}
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
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {
          path: `media/${grampsId}`,
        },
      })
    )
  }

  renderTabs() {
    const tabKeys = this._getTabs(this.edit)
    if (!tabKeys.includes(this._currentTab)) {
      ;[this._currentTab] = tabKeys
    }
    if (tabKeys.length === 0) {
      return html``
    }
    return html`
      <mwc-tab-bar
        .activeIndex=${this._currentTabId}
        @MDCTabBar:activated=${this._handleTabActivated}
        @MDCTab:interacted=${this._handleTabInteracted}
        id="tab-bar"
      >
        ${tabKeys.map(key => this._makeTab(key))}
      </mwc-tab-bar>
    `
  }

  renderBeforeTags() {
    return ''
  }

  renderTags() {
    return html` <grampsjs-tags
      .data=${this.data?.extended?.tags || []}
      ?edit="${this.edit}"
      @tag:new="${this._handleNewTag}"
    ></grampsjs-tags>`
  }

  renderPrivacy() {
    if (!this.edit) {
      return ''
    }
    return html` <grampsjs-privacy
      ?private="${this.data.private}"
      ?edit="${this.edit}"
    ></grampsjs-privacy>`
  }

  renderTabContent() {
    const mapBounds = (this.data.attribute_list || []).filter(
      attr => attr.type === 'map:bounds'
    )
    switch (this._currentTab) {
      case 'relationships':
        return html`<grampsjs-relationships
          grampsId="${this.data.gramps_id}"
          .strings=${this.strings}
          ?edit=${this.edit}
          .familyList=${this.data?.extended?.families || []}
          .parentFamilyList=${this.data?.extended?.parent_families || []}
          .families=${this.data?.profile?.families || []}
          .primaryParentFamily=${this.data?.profile?.primary_parent_family ||
          {}}
          .otherParentFamilies=${this.data?.profile?.other_parent_families ||
          []}
        ></grampsjs-relationships>`
      case 'names':
        return html`
          <grampsjs-names
            .strings="${this.strings}"
            .data="${[this.data.primary_name, ...this.data.alternate_names]}"
            ?edit=${this.edit}
          ></grampsjs-names>
        `
      case 'enclosed':
        return html` ${this.data.placeref_list?.length || this.edit
          ? html`
      <h4>${this._('Enclosed By')}</h3>
        <grampsjs-place-refs
          .strings="${this.strings}"
          .data="${this.data?.placeref_list}"
          ?edit="${this.edit}"
        ></grampsjs-place-refs>
        `
          : ''}
        ${this.data?.backlinks?.place?.length
          ? html`<h4>${this._('Encloses')}</h3>
        <grampsjs-place-children
          .strings="${this.strings}"
          .data="${this.data?.profile?.references?.place || []}"
          ?edit="false"
        ></grampsjs-place-children>
        `
          : ''}`
      case 'map':
        return html` ${this.edit
          ? html`
              <p>
                <mwc-button
                  icon="edit"
                  class="edit"
                  @click="${this._handleEditGeo}"
                  >${this._('Edit coordinates')}</mwc-button
                >
              </p>
            `
          : ''}
        ${
          // eslint-disable-next-line no-nested-ternary
          this.data.lat && this.data.long
            ? html` <grampsjs-map
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
            : mapBounds.length > 0
            ? html` <grampsjs-map
                latitude="${(JSON.parse(mapBounds[0].value)[0][0] +
                  JSON.parse(mapBounds[0].value)[1][0]) /
                2}"
                longitude="${(JSON.parse(mapBounds[0].value)[0][1] +
                  JSON.parse(mapBounds[0].value)[1][1]) /
                2}"
                zoom="${this._getZoomFromBounds(
                  JSON.parse(mapBounds[0].value)
                )}"
                mapid="media-map"
                id="map"
              >
                <grampsjs-map-overlay
                  url="${getMediaUrl(this.data.handle)}"
                  bounds="${mapBounds[0].value}"
                  title="${this.data.desc}"
                >
                </grampsjs-map-overlay>
              </grampsjs-map>`
            : ''
        }`
      case 'events':
        return html`<grampsjs-events
          hasShare
          hasAdd
          .strings=${this.strings}
          .data=${this.data?.extended?.events}
          .profile=${this.data?.profile?.events}
          ?edit="${this.edit}"
        ></grampsjs-events>`
      case 'placeEvents':
        return html`<grampsjs-events
          useSummary
          sorted
          .strings=${this.strings}
          .data=${this.data?.extended?.backlinks?.event}
          .profile=${this.data?.profile?.references?.event}
        ></grampsjs-events>`
      case 'timeline':
        if (this._showPersonTimeline) {
          return html`<grampsjs-view-person-timeline
            active
            .strings=${this.strings}
            handle=${this.data.handle}
          ></grampsjs-view-person-timeline>`
        }
        return ''
      case 'sources':
        return html`<grampsjs-sources
          .strings=${this.strings}
          .data=${this.data?.extended?.backlinks?.source || []}
        ></grampsjs-sources>`
      case 'citations': {
        let data = this.data?.profile?.references?.citation || []
        if (data.length > 0) {
          data = data.map((cit, i) => ({
            ...cit,
            media_list: this.data?.extended?.backlinks?.citation[i]?.media_list,
          }))
        }
        return html`<grampsjs-citations
          .strings=${this.strings}
          .data=${data}
        ></grampsjs-citations>`
      }
      case 'children':
        return html`<grampsjs-children
          .strings=${this.strings}
          .data=${this.data?.child_ref_list}
          .profile=${this.data?.profile?.children}
          ?edit="${this.edit}"
        ></grampsjs-children>`
      case 'sourceCitations':
        return html`<grampsjs-view-source-citations
          active
          .strings=${this.strings}
          ?edit="${this.edit}"
          .grampsIds=${(this.data?.extended?.citations || [])
            .map(obj => obj.gramps_id)
            .filter(obj => Boolean(obj))}
        ></grampsjs-view-source-citations>`
      case 'attributes':
        return html`<grampsjs-attributes
          hasEdit
          .strings=${this.strings}
          ?edit="${this.edit}"
          .data=${this.data.attribute_list}
        ></grampsjs-attributes>`
      case 'addresses':
        return html`<grampsjs-addresses
          .strings=${this.strings}
          .data=${this.data.address_list}
        ></grampsjs-addresses>`
      case 'notes':
        return html` <grampsjs-view-object-notes
          active
          .strings=${this.strings}
          .grampsIds=${(this.data?.extended?.notes || [])
            .map(obj => obj.gramps_id)
            .filter(obj => Boolean(obj))}
          ?edit="${this.edit}"
        ></grampsjs-view-object-notes>`
      case 'gallery':
        return html` <grampsjs-gallery
          .strings=${this.strings}
          .media=${this.data?.extended?.media}
          .mediaRef=${this.data?.media_list}
          ?edit="${this.edit}"
          ?editRect="${this.canEdit}"
        ></grampsjs-gallery>`
      case 'internet':
        return html`<grampsjs-urls
          hasEdit
          .strings=${this.strings}
          .data=${this.data.urls}
          ?edit="${this.edit}"
        ></grampsjs-urls>`
      case 'associations':
        return html`<grampsjs-associations
          .strings=${this.strings}
          .data=${this.data?.person_ref_list || []}
          .extended=${this.data?.extended?.people || []}
        ></grampsjs-associations>`
      case 'participants':
        return html`<grampsjs-participants
          .strings=${this.strings}
          .data=${[this.data?.profile?.participants]}
        ></grampsjs-participants>`
      case 'repositories':
        return html` <grampsjs-repositories
          .strings=${this.strings}
          .data=${this.data?.reporef_list}
          .extended=${this.data?.extended?.repositories}
          ?edit=${this.edit}
        ></grampsjs-repositories>`
      case 'references':
        return html`<grampsjs-references
          .strings=${this.strings}
          .data=${[this.data?.extended?.backlinks]}
          .profile=${this.data?.profile?.references || {}}
        ></grampsjs-references>`
      default:
        break
    }
    return html``
  }

  _getTabs(edit) {
    if (edit) {
      return Object.keys(_allTabs).filter(key =>
        _allTabs[key].conditionEdit(this.data)
      )
    }
    return Object.keys(_allTabs).filter(
      key =>
        _allTabs[key].condition(this.data) &&
        (this._showReferences || key !== 'references') &&
        (this._showFamilyTimeline ||
          this._showPersonTimeline ||
          key !== 'timeline')
    )
  }

  _makeTab(key) {
    return html`
      <mwc-tab id="${key}" label="${this._(_allTabs[key].title)}"> </mwc-tab>
    `
  }

  updated(changed) {
    if (changed.has('edit')) {
      this._updateTabIndicator(changed.get('  '))
    }
  }

  _updateTabIndicator(edit) {
    const tabKeys = this._getTabs(!edit)
    if (
      tabKeys.includes(this._currentTab) &&
      tabKeys.indexOf(this._currentTab) !== this._currentTabId
    ) {
      this._currentTabId = tabKeys.indexOf(this._currentTab)
    }
  }

  _handleTabActivated(event) {
    this._currentTabId = event.detail.index
  }

  _handleTabInteracted(event) {
    this._currentTab = event.detail.tabId
  }

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleNewTag() {
    this.dialogContent = html`
      <grampsjs-form-new-tag
        .data="${this.data.tag_list}"
        @object:save="${this._handleSaveTag}"
        @object:cancel="${this._handleCancelDialog}"
      >
      </grampsjs-form-new-tag>
    `
  }

  _handleSaveTag(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {tag_list: e.detail.data},
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _getZoomFromBounds(bounds) {
    const xMin = bounds[0][0]
    const yMin = bounds[0][1]
    const xMax = bounds[1][0]
    const yMax = bounds[1][1]
    const Lx = xMax - xMin
    const Ly = yMax - yMin
    const L = Math.max(Lx, Ly)
    return Math.round(Math.log2(360 / L))
  }
}
