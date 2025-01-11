/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

import '../views/GrampsjsViewPeople.js'
import '../views/GrampsjsViewFamilies.js'
import '../views/GrampsjsViewPlaces.js'
import '../views/GrampsjsViewEvents.js'
import '../views/GrampsjsViewReport.js'
import '../views/GrampsjsViewReports.js'
import '../views/GrampsjsViewSources.js'
import '../views/GrampsjsViewCitations.js'
import '../views/GrampsjsViewRepositories.js'
import '../views/GrampsjsViewNotes.js'
import '../views/GrampsjsViewMediaObjects.js'
import '../views/GrampsjsViewChat.js'
import '../views/GrampsjsViewExport.js'
import '../views/GrampsjsViewPerson.js'
import '../views/GrampsjsViewFamily.js'
import '../views/GrampsjsViewPlace.js'
import '../views/GrampsjsViewEvent.js'
import '../views/GrampsjsViewSource.js'
import '../views/GrampsjsViewTask.js'
import '../views/GrampsjsViewTasks.js'
import '../views/GrampsjsViewBlog.js'
import '../views/GrampsjsViewBlogPost.js'
import '../views/GrampsjsViewCitation.js'
import '../views/GrampsjsViewDashboard.js'
import '../views/GrampsjsViewRepository.js'
import '../views/GrampsjsViewNote.js'
import '../views/GrampsjsViewMedia.js'
import '../views/GrampsjsViewSearch.js'
import '../views/GrampsjsViewSettings.js'
import '../views/GrampsjsViewRecent.js'
import '../views/GrampsjsViewRevisions.js'
import '../views/GrampsjsViewRevision.js'
import '../views/GrampsjsViewBookmarks.js'
import '../views/GrampsjsViewDnaMatches.js'
import '../views/GrampsjsViewMap.js'
import '../views/GrampsjsViewTree.js'
import '../views/GrampsjsViewNewPerson.js'
import '../views/GrampsjsViewNewFamily.js'
import '../views/GrampsjsViewNewEvent.js'
import '../views/GrampsjsViewNewPlace.js'
import '../views/GrampsjsViewNewSource.js'
import '../views/GrampsjsViewNewCitation.js'
import '../views/GrampsjsViewNewRepository.js'
import '../views/GrampsjsViewNewNote.js'
import '../views/GrampsjsViewNewMedia.js'
import '../views/GrampsjsViewNewTask.js'

class GrampsjsPages extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .page {
          display: none;
        }

        .page[active] {
          display: block;
        }
      `,
    ]
  }

  static get properties() {
    return {
      settings: {type: Object},
      canAdd: {type: Boolean},
      canEdit: {type: Boolean},
      canManageUsers: {type: Boolean},
      canViewPrivate: {type: Boolean},
      canUseChat: {type: Boolean},
      homePersonDetails: {type: Object},
      strings: {type: Object},
      dbInfo: {type: Object},
      page: {type: String},
      pageId: {type: String},
    }
  }

  constructor() {
    super()
    this.settings = {}
    this.canAdd = false
    this.canEdit = false
    this.canManageUsers = false
    this.canUseChat = false
    this.homePersonDetails = {}
    this.strings = {}
    this.dbInfo = {}
    this.page = ''
    this.pageId = ''
  }

  render() {
    return html`
      <grampsjs-view-dashboard
        class="page"
        ?active=${this.page === 'home'}
        .strings="${this.strings}"
        .dbInfo="${this.dbInfo}"
        .homePersonDetails=${this.homePersonDetails}
        .homePersonGrampsId=${this.settings.homePerson ?? ''}
      ></grampsjs-view-dashboard>
      <grampsjs-view-blog
        class="page"
        ?active=${this.page === 'blog' && !this.pageId}
        .strings="${this.strings}"
      ></grampsjs-view-blog>
      <grampsjs-view-blog-post
        class="page"
        ?active=${this.page === 'blog' && this.pageId}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
      ></grampsjs-view-blog-post>

      <grampsjs-view-people
        class="page"
        ?active=${this.page === 'people'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-people>
      <grampsjs-view-families
        class="page"
        ?active=${this.page === 'families'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd && this.canEdit}
      ></grampsjs-view-families>
      <grampsjs-view-events
        class="page"
        ?active=${this.page === 'events'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-events>
      <grampsjs-view-places
        class="page"
        ?active=${this.page === 'places'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-places>
      <grampsjs-view-sources
        class="page"
        ?active=${this.page === 'sources'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-sources>
      <grampsjs-view-citations
        class="page"
        ?active=${this.page === 'citations'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-citations>
      <grampsjs-view-repositories
        class="page"
        ?active=${this.page === 'repositories'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-repositories>
      <grampsjs-view-notes
        class="page"
        ?active=${this.page === 'notes'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd}
      ></grampsjs-view-notes>
      <grampsjs-view-media-objects
        class="page"
        ?active=${this.page === 'medialist'}
        .strings="${this.strings}"
        ?canAdd=${this.canAdd && this.canEdit}
      ></grampsjs-view-media-objects>

      <grampsjs-view-dna-matches
        class="page"
        ?active=${this.page === 'dna'}
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
        homePersonHandle="${this.homePersonDetails?.handle ?? ''}"
        ?matches="${this.pageId !== 'chromosome'}"
        ?chromosome="${this.pageId === 'chromosome'}"
      ></grampsjs-view-dna-matches>

      <grampsjs-view-map
        class="page"
        ?active=${this.page === 'map'}
        .strings="${this.strings}"
      ></grampsjs-view-map>
      <grampsjs-view-tree
        class="page"
        ?active=${this.page === 'tree'}
        grampsId="${this.settings.homePerson}"
        .strings="${this.strings}"
        .settings="${this.settings}"
      ></grampsjs-view-tree>
      <grampsjs-view-person
        class="page"
        ?active=${this.page === 'person'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
        .homePersonDetails=${this.homePersonDetails}
      ></grampsjs-view-person>
      <grampsjs-view-family
        class="page"
        ?active=${this.page === 'family'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-family>
      <grampsjs-view-event
        class="page"
        ?active=${this.page === 'event'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-event>
      <grampsjs-view-place
        class="page"
        ?active=${this.page === 'place'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-place>
      <grampsjs-view-source
        class="page"
        ?active=${this.page === 'source'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-source>
      <grampsjs-view-citation
        class="page"
        ?active=${this.page === 'citation'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-citation>
      <grampsjs-view-repository
        class="page"
        ?active=${this.page === 'repository'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-repository>
      <grampsjs-view-note
        class="page"
        ?active=${this.page === 'note'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-note>
      <grampsjs-view-media
        class="page"
        ?active=${this.page === 'media'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
        .dbInfo="${this.dbInfo}"
      ></grampsjs-view-media>
      ${this.canUseChat
        ? html`
            <grampsjs-view-chat
              class="page"
              ?active=${this.page === 'chat'}
              .strings="${this.strings}"
            ></grampsjs-view-chat>
          `
        : ''}
      <grampsjs-view-export
        class="page"
        ?active=${this.page === 'export'}
        .strings="${this.strings}"
      ></grampsjs-view-export>
      <grampsjs-view-reports
        class="page"
        ?active=${this.page === 'reports'}
        .strings="${this.strings}"
      ></grampsjs-view-reports>
      <grampsjs-view-search
        class="page"
        ?active=${this.page === 'search'}
        .strings="${this.strings}"
        .dbInfo="${this.dbInfo}"
      ></grampsjs-view-search>
      <grampsjs-view-recent
        class="page"
        ?active=${this.page === 'recent'}
        .strings="${this.strings}"
      ></grampsjs-view-recent>
      <grampsjs-view-bookmarks
        class="page"
        ?active=${this.page === 'bookmarks'}
        .strings="${this.strings}"
      ></grampsjs-view-bookmarks>
      <grampsjs-view-tasks
        class="page"
        ?active=${this.page === 'tasks'}
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
        ?canAdd="${this.canAdd}"
      ></grampsjs-view-tasks>
      <grampsjs-view-settings
        class="page"
        ?active=${this.page === 'settings'}
        .dbInfo="${this.dbInfo}"
        .strings="${this.strings}"
        ?owner="${this.canManageUsers}"
      ></grampsjs-view-settings>
      <grampsjs-view-report
        class="page"
        ?active=${this.page === 'report'}
        .strings="${this.strings}"
        reportId="${this.pageId}"
      ></grampsjs-view-report>
      ${this.canViewPrivate
        ? html`
            <grampsjs-view-revisions
              class="page"
              ?active=${this.page === 'revisions'}
              .strings="${this.strings}"
            ></grampsjs-view-revisions>
          `
        : ''}
      <grampsjs-view-revision
        class="page"
        transactionId="${this.pageId}"
        ?active=${this.page === 'revision'}
        .strings="${this.strings}"
      ></grampsjs-view-revision>

      <grampsjs-view-new-person
        class="page"
        ?active=${this.page === 'new_person'}
        .strings="${this.strings}"
      ></grampsjs-view-new-person>
      <grampsjs-view-new-family
        class="page"
        ?active=${this.page === 'new_family'}
        .strings="${this.strings}"
      ></grampsjs-view-new-family>
      <grampsjs-view-new-event
        class="page"
        ?active=${this.page === 'new_event'}
        .strings="${this.strings}"
      ></grampsjs-view-new-event>
      <grampsjs-view-new-place
        class="page"
        ?active=${this.page === 'new_place'}
        .strings="${this.strings}"
      ></grampsjs-view-new-place>
      <grampsjs-view-new-source
        class="page"
        ?active=${this.page === 'new_source'}
        .strings="${this.strings}"
      ></grampsjs-view-new-source>
      <grampsjs-view-new-citation
        class="page"
        ?active=${this.page === 'new_citation'}
        .strings="${this.strings}"
      ></grampsjs-view-new-citation>
      <grampsjs-view-new-repository
        class="page"
        ?active=${this.page === 'new_repository'}
        .strings="${this.strings}"
      ></grampsjs-view-new-repository>
      <grampsjs-view-new-note
        class="page"
        ?active=${this.page === 'new_note'}
        .strings="${this.strings}"
      ></grampsjs-view-new-note>
      <grampsjs-view-new-media
        class="page"
        ?active=${this.page === 'new_media'}
        .strings="${this.strings}"
      ></grampsjs-view-new-media>
      <grampsjs-view-new-task
        class="page"
        ?active=${this.page === 'new_task'}
        .strings="${this.strings}"
      ></grampsjs-view-new-task>
      <grampsjs-view-task
        class="page"
        ?active=${this.page === 'task'}
        grampsId="${this.pageId}"
        .strings="${this.strings}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-view-task>
    `
  }
}

window.customElements.define('grampsjs-pages', GrampsjsPages)
