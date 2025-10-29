/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
import {LitElement, css, html} from 'lit'

import {mdiTableOfContents} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/dialog/dialog.js'

import {sharedStyles} from '../SharedStyles.js'
import '../views/GrampsjsViewObjectNotes.js'
import '../views/GrampsjsViewSourceCitations.js'
import '../views/GrampsjsViewPersonTimeline.js'
import './GrampsjsAddresses.js'
import './GrampsjsAssociations.js'
import './GrampsjsAttributes.js'
import './GrampsjsBreadcrumbs.js'
import './GrampsjsChildren.js'
import './GrampsjsCitations.js'
import './GrampsjsEvents.js'
import './GrampsjsIcon.js'
import './GrampsjsNames.js'
import './GrampsjsPlaceChildren.js'
import './GrampsjsPlaceRefs.js'
import './GrampsjsPlaceNames.js'
import './GrampsjsGallery.js'
import './GrampsjsMap.js'
import './GrampsjsMapMarker.js'
import './GrampsjsParticipants.js'
import './GrampsjsReferences.js'
import './GrampsjsRelationships.js'
import './GrampsjsRepositories.js'
import './GrampsjsSources.js'
import './GrampsjsTags.js'
import './GrampsjsUrls.js'
import './GrampsjsObjectToc.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

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
  enclosed: {
    title: 'Place Hierarchy',
    condition: data =>
      data.placeref_list?.length > 0 ||
      ('placeref_list' in data && data?.backlinks?.place?.length >= 0),
    conditionEdit: data => 'placeref_list' in data,
  },
  placeNames: {
    title: 'Alternate Names',
    condition: data => data?.alt_names?.length > 0,
    conditionEdit: data => 'alt_names' in data,
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
  names: {
    title: '_Names',
    condition: data => 'primary_name' in data,
    conditionEdit: data => 'primary_name' in data,
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
  metadata: {
    title: 'Metadata',
    condition: data =>
      data?.attribute_list?.length > 0 ||
      data?.urls?.length > 0 ||
      data?.address_list?.length > 0,
    conditionEdit: data => 'urls' in data || 'attribute_list' in data,
  },
  associations: {
    title: 'Associations',
    condition: data => data?.person_ref_list?.length > 0,
    conditionEdit: data => 'person_ref_list' in data,
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

const zoomByPlaceType = {
  Country: 4,
  State: 6,
  Province: 7,
  Region: 7,
  Department: 9,
  County: 11,
  Parish: 12,
  District: 12,
  Borough: 12,
  Municipality: 12,
  City: 13,
  Town: 13,
  Locality: 14,
  Village: 14,
  Neighborhood: 15,
  Hamlet: 15,
  Street: 16,
  Farm: 17,
  Building: 19,
  Number: 19,
}

export class GrampsjsObject extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        pre {
          max-width: 80%;
          font-size: 11px;
        }

        #picture {
          margin-bottom: 60px;
          position: relative;
          text-align: center;
        }

        .content-wrapper {
          display: flex;
          margin-top: 30px;
          clear: both;
        }

        .sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
        }

        .row {
          display: flex;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          max-width: 100%;
          min-width: 0;
          flex-shrink: 1;
        }

        .section {
          flex: 1 1 200px;
          scroll-margin-top: 100px;
          margin-right: 20px;
          max-width: 100%;
          min-width: 0;
          flex-shrink: 1;
        }

        .sections h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }

        .section * {
          min-width: 0;
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        p.button-list {
          display: flex;
          gap: 12px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        div.tags {
          padding-top: 1em;
        }

        div.toc {
          display: none;
        }

        div.bottom-bar {
          position: fixed;
          display: none; /* flex */
          bottom: 0;
          right: 0;
          width: 100%;
          height: 50px;
          background-color: white;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          box-sizing: border-box;
        }

        div.bottom-bar-content {
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: row;
          padding: 10px;
          justify-content: space-between;
          box-sizing: border-box;
        }

        div.bottom-bar-content > * {
          flex: 1 1 auto;
          align-items: center;
          text-align: center;
        }

        div.bottom-bar-content md-icon-button {
          --md-icon-button-icon-size: 22px;
          width: 34px;
          height: 34px;
        }

        @media (min-width: 992px) {
          #picture {
            float: right;
            text-align: right;
            margin-left: 40px;
            margin-right: 0px;
          }
        }

        .toc-button {
          position: relative;
          top: 4px;
          padding-left: 8px;
        }

        @media (min-width: 1200px) {
          div.toc {
            display: block;
            margin-left: auto;
            position: sticky;
            width: 200px;
            top: 100px;
            height: fit-content;
            margin-left: auto;
            overflow-x: hidden;
            text-overflow: ellipsis;
          }

          .sections {
            width: calc(100% - 235px);
            padding-right: 35px;
          }

          .row {
            display: flex;
            justify-content: space-between;
          }

          div.bottom-bar {
            display: none;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      edit: {type: Boolean},
      dialogContent: {type: String},
      _objectsName: {type: String},
      _objectEndpoint: {type: String},
      _objectIcon: {type: String},
      _showReferences: {type: Boolean},
      _showPersonTimeline: {type: Boolean},
      _showFamilyTimeline: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.edit = false
    this.dialogContent = ''
    this._objectsName = 'Objects'
    this._objectIcon = ''
    this._showReferences = true
    this._showPersonTimeline = false
    this._showFamilyTimeline = false
    this._sectionObserver = null
    this._currentVisibleSection = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._setupIntersectionObserver()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._teardownIntersectionObserver()
  }

  updated(changedProperties) {
    super.updated(changedProperties)

    // Re-setup the observer when the data changes to observe the new sections
    if (changedProperties.has('data') && Object.keys(this.data).length > 0) {
      this._setupIntersectionObserver()
    }
  }

  get tocSidebar() {
    return this.appState.screenSize === 'large'
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
      ${this.renderHeader()}

      <div id="picture">${this.renderPicture()}</div>

      ${this.renderProfile()}

      <div style="clear:left;"></div>

      <div class="tags">${this.renderTags()}</div>

      <div class="content-wrapper">
        <div class="sections">${this.renderSections()}</div>
        <div class="toc">${this.tocSidebar ? this.renderToc() : ''}</div>
      </div>
      ${this.tocSidebar
        ? ''
        : html`
            <md-dialog
              id="toc-dialog"
              @toc-item-click="${this._closeTocDialog}"
              quick
            >
              <div slot="headline">${this._('Table Of Contents')}</div>
              <div slot="content">${this.renderToc(false)}</div>
            </md-dialog>
          `}
      <div class="bottom-bar">
        <div class="bottom-bar-content"></div>
      </div>

      ${this.dialogContent}
    `
  }

  renderToc(heading = true) {
    // Get all tabs/sections that should be displayed
    const tabKeys = this._getTabs(this.edit)

    // Create object with just the tabs we need to show
    const visibleTabs = {}
    tabKeys.forEach(key => {
      visibleTabs[key] = _allTabs[key]
    })

    return html`
      <grampsjs-object-toc
        ?heading="${heading}"
        .tabs=${visibleTabs}
        .appState="${this.appState}"
        .activeSection="${this._currentVisibleSection}"
        @toc-item-click=${this._handleTocItemClick}
      ></grampsjs-object-toc>
    `
  }

  _handleTocItemClick(e) {
    const {sectionKey} = e.detail
    const section = this.shadowRoot.querySelector(`#section-${sectionKey}`)
    if (section) {
      // Update the current visible section
      this._currentVisibleSection = sectionKey

      // Scroll to the section
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    }
  }

  renderHeader() {
    return html`
      <grampsjs-breadcrumbs
        .data="${this.data}"
        .appState="${this.appState}"
        ?edit="${this.edit}"
        objectsName="${this._objectsName}"
        objectIcon="${this._objectIcon}"
        objectEndpoint="${this._objectEndpoint}"
      ></grampsjs-breadcrumbs>
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

  renderSections() {
    const tabKeys = this._getTabs(this.edit)
    if (!tabKeys.includes(this._currentTab)) {
      ;[this._currentTab] = tabKeys
    }
    if (tabKeys.length === 0) {
      return html``
    }
    return html`
      ${tabKeys.map(
        (key, idx, tabKeysArray) => html`<div class="row">
          <div class="section" id="section-${key}">
            <h3>
              ${this._(_allTabs[key].title)}
              ${this.tocSidebar || tabKeysArray.length <= 1
                ? ''
                : html`
                    <md-icon-button
                      class="toc-button"
                      @click="${this._openTocDialog}"
                    >
                      <grampsjs-icon
                        .path="${mdiTableOfContents}"
                        color="rgba(0, 0, 0, 0.4)"
                      ></grampsjs-icon>
                    </md-icon-button>
                  `}
            </h3>
            ${this.renderSectionContent(key)}
          </div>
        </div>`
      )}
    `
  }

  _openTocDialog() {
    const dialog = this.renderRoot.querySelector('#toc-dialog')
    if (dialog) {
      dialog.open = true
    }
  }

  _closeTocDialog() {
    const dialog = this.renderRoot.querySelector('#toc-dialog')
    if (dialog) {
      dialog.open = false
    }
  }

  renderTags() {
    return html` <grampsjs-tags
      .data=${this.data?.extended?.tags || []}
      ?edit="${this.edit}"
      .appState="${this.appState}"
      @tag:new="${this._handleNewTag}"
    ></grampsjs-tags>`
  }

  renderSectionContent(sectionKey) {
    const mapBounds = (this.data.attribute_list || []).filter(
      attr => attr.type === 'map:bounds'
    )
    switch (sectionKey) {
      case 'relationships':
        return html`<grampsjs-relationships
          grampsId="${this.data.gramps_id}"
          .appState="${this.appState}"
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
            .appState="${this.appState}"
            .data="${[this.data.primary_name, ...this.data.alternate_names]}"
            ?edit=${this.edit}
          ></grampsjs-names>
        `
      case 'placeNames':
        return html` ${this.data.alt_names?.length > 0 || this.edit
          ? html` <grampsjs-place-names
              .appState="${this.appState}"
              .strings="${this.strings}"
              .data="${this.data.alt_names}"
              .profile="${this.data.profile.alternate_place_names || []}"
              ?edit=${this.edit}
            ></grampsjs-place-names>`
          : ''}`
      case 'enclosed':
        return html` ${this.data.placeref_list?.length || this.edit
          ? html`
              <h4>${this._('Enclosed By')}</h4>
              <grampsjs-place-refs
                .appState="${this.appState}"
                .data="${this.data?.placeref_list}"
                .profile="${this.data?.profile.direct_parent_places || []}"
                ?edit="${this.edit}"
              ></grampsjs-place-refs>
            `
          : ''}
        ${this.data?.backlinks?.place?.length
          ? html`<h4>${this._('Encloses')}</h4>
              <grampsjs-place-children
                .appState="${this.appState}"
                .data="${this.data?.profile?.references?.place || []}"
                ?edit=${false}
              ></grampsjs-place-children> `
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
                .appState="${this.appState}"
                latitude="${this.data.profile.lat}"
                longitude="${this.data.profile.long}"
                zoom="${this.data?.place_type in zoomByPlaceType
                  ? zoomByPlaceType[this.data.place_type]
                  : 13}"
                layerSwitcher
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
                .appState="${this.appState}"
                latitude="${(JSON.parse(mapBounds[0].value)[0][0] +
                  JSON.parse(mapBounds[0].value)[1][0]) /
                2}"
                longitude="${(JSON.parse(mapBounds[0].value)[0][1] +
                  JSON.parse(mapBounds[0].value)[1][1]) /
                2}"
                zoom="${this._getZoomFromBounds(
                  JSON.parse(mapBounds[0].value)
                )}"
                layerSwitcher
                mapid="media-map"
                id="map"
              >
                <grampsjs-map-overlay
                  url="${getMediaUrl(this.data.handle)}"
                  .bounds="${JSON.parse(mapBounds[0].value)}"
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
          hasEdit
          defaultRole=${this._objectsName === 'Families' ? 'Family' : 'Primary'}
          .appState="${this.appState}"
          .data=${this.data?.extended?.events}
          .profile=${this.data?.profile?.events}
          .eventRef=${this.data?.event_ref_list}
          ?edit="${this.edit}"
        ></grampsjs-events>`
      case 'placeEvents':
        return html`<grampsjs-events
          useSummary
          sorted
          .appState="${this.appState}"
          .data=${this.data?.extended?.backlinks?.event}
          .profile=${this.data?.profile?.references?.event}
        ></grampsjs-events>`
      case 'sources':
        return html`<grampsjs-sources
          .appState="${this.appState}"
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
          .appState="${this.appState}"
          .data=${data}
        ></grampsjs-citations>`
      }
      case 'children':
        return html`<grampsjs-children
          .appState="${this.appState}"
          .data=${this.data?.child_ref_list}
          .profile=${this.data?.profile?.children}
          ?edit="${this.edit}"
        ></grampsjs-children>`
      case 'sourceCitations':
        return html`<grampsjs-view-source-citations
          active
          .appState="${this.appState}"
          ?edit="${this.edit}"
          .grampsIds=${(this.data?.extended?.citations || [])
            .map(obj => obj.gramps_id)
            .filter(obj => Boolean(obj))}
        ></grampsjs-view-source-citations>`
      case 'notes':
        return html` <grampsjs-view-object-notes
          active
          .appState="${this.appState}"
          .grampsIds=${(this.data?.extended?.notes || [])
            .map(obj => obj.gramps_id)
            .filter(obj => Boolean(obj))}
          ?edit="${this.edit}"
          numberOfNotes="${this.data?.note_list?.length || 0}"
        ></grampsjs-view-object-notes>`
      case 'gallery':
        return html` <grampsjs-gallery
          .appState="${this.appState}"
          .media=${this.data?.extended?.media}
          .mediaRef=${this.data?.media_list}
          ?edit="${this.edit}"
          ?editRect="${this.appState.permissions.canEdit}"
        ></grampsjs-gallery>`
      case 'metadata':
        return html`
          ${this.data.attribute_list?.length > 0 ||
          (this.edit && 'attribute_list' in this.data)
            ? html` <h4>${this._('Attributes')}</h4>
                <grampsjs-attributes
                  hasEdit
                  .appState="${this.appState}"
                  ?edit="${this.edit}"
                  .data=${this.data.attribute_list ?? []}
                  attributeCategory="${this._objectsName.toLowerCase()}"
                ></grampsjs-attributes>`
            : ''}
          ${this.data.address_list?.length > 0
            ? html`<h4>${this._('Addresses')}</h4>
                <grampsjs-addresses
                  .appState="${this.appState}"
                  .data=${this.data.address_list ?? []}
                ></grampsjs-addresses>`
            : ''}
          ${this.data.urls?.length > 0 || (this.edit && 'urls' in this.data)
            ? html`<h4>${this._('Internet')}</h4>
                <grampsjs-urls
                  hasEdit
                  .appState="${this.appState}"
                  .data=${this.data.urls ?? []}
                  ?edit="${this.edit}"
                ></grampsjs-urls>`
            : ''}
        `
      case 'associations':
        return html`<grampsjs-associations
          hasEdit
          .appState="${this.appState}"
          .data=${this.data?.person_ref_list || []}
          .extended=${this.data?.extended?.people || []}
          ?edit="${this.edit}"
        ></grampsjs-associations>`
      case 'participants':
        return html`<grampsjs-participants
          .appState="${this.appState}"
          .data=${[this.data?.profile?.participants]}
        ></grampsjs-participants>`
      case 'repositories':
        return html` <grampsjs-repositories
          .appState="${this.appState}"
          .data=${this.data?.reporef_list}
          .extended=${this.data?.extended?.repositories}
          ?edit=${this.edit}
        ></grampsjs-repositories>`
      case 'references':
        return html`<grampsjs-references
          .appState="${this.appState}"
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

  _handleCancelDialog() {
    this.dialogContent = ''
  }

  _handleNewTag() {
    this.dialogContent = html`
      <grampsjs-form-new-tag
        .appState="${this.appState}"
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

  _handleSaveType(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: e.detail.data,
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

  _setupIntersectionObserver() {
    // Wait for the DOM to be ready
    setTimeout(() => {
      if (this._sectionObserver) {
        this._teardownIntersectionObserver()
      }

      const options = {
        root: null, // use viewport as root
        rootMargin: '-100px 0px -70% 0px', // section needs to be near the top of the viewport
        threshold: 0, // trigger when any part of the section is visible
      }

      this._sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id
            const sectionKey = sectionId.replace('section-', '')

            // Update the current visible section
            this._currentVisibleSection = sectionKey

            // Update the TOC component
            const tocComponent = this.shadowRoot.querySelector(
              'grampsjs-object-toc'
            )
            if (tocComponent) {
              tocComponent.setActiveSection(sectionKey)
            }
          }
        })
      }, options)

      // Observe all sections
      const tabKeys = this._getTabs(this.edit)
      tabKeys.forEach(key => {
        const section = this.shadowRoot?.querySelector(`#section-${key}`)
        if (section) {
          this._sectionObserver.observe(section)
        }
      })
    }, 100) // Short delay to ensure the DOM is ready
  }

  _teardownIntersectionObserver() {
    if (this._sectionObserver) {
      this._sectionObserver.disconnect()
      this._sectionObserver = null
    }
  }
}
