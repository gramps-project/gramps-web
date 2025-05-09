/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

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
import '../views/GrampsjsViewSettingsUser.js'
import '../views/GrampsjsViewSysinfo.js'
import '../views/GrampsjsViewAdminSettings.js'
import '../views/GrampsjsViewUserManagement.js'
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

class GrampsjsPages extends GrampsjsAppStateMixin(LitElement) {
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
      homePersonDetails: {type: Object},
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.settings = {}
    this.homePersonDetails = {}
    this.dbInfo = {}
  }

  render() {
    return html`
      <grampsjs-view-dashboard
        class="page"
        ?active=${this.appState.path.page === 'home'}
        .appState="${this.appState}"
        .dbInfo="${this.dbInfo}"
        .homePersonDetails=${this.homePersonDetails}
        .homePersonGrampsId=${this.settings.homePerson ?? ''}
      ></grampsjs-view-dashboard>
      <grampsjs-view-blog
        class="page"
        ?active=${this.appState.path.page === 'blog' &&
        !this.appState.path.pageId}
        .appState="${this.appState}"
      ></grampsjs-view-blog>
      <grampsjs-view-blog-post
        class="page"
        ?active=${this.appState.path.page === 'blog' &&
        this.appState.path.pageId}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-blog-post>

      <grampsjs-view-people
        class="page"
        ?active=${this.appState.path.page === 'people'}
        .appState="${this.appState}"
      ></grampsjs-view-people>
      <grampsjs-view-families
        class="page"
        ?active=${this.appState.path.page === 'families'}
        .appState="${this.appState}"
      ></grampsjs-view-families>
      <grampsjs-view-events
        class="page"
        ?active=${this.appState.path.page === 'events'}
        .appState="${this.appState}"
      ></grampsjs-view-events>
      <grampsjs-view-places
        class="page"
        ?active=${this.appState.path.page === 'places'}
        .appState="${this.appState}"
      ></grampsjs-view-places>
      <grampsjs-view-sources
        class="page"
        ?active=${this.appState.path.page === 'sources'}
        .appState="${this.appState}"
      ></grampsjs-view-sources>
      <grampsjs-view-citations
        class="page"
        ?active=${this.appState.path.page === 'citations'}
        .appState="${this.appState}"
      ></grampsjs-view-citations>
      <grampsjs-view-repositories
        class="page"
        ?active=${this.appState.path.page === 'repositories'}
        .appState="${this.appState}"
      ></grampsjs-view-repositories>
      <grampsjs-view-notes
        class="page"
        ?active=${this.appState.path.page === 'notes'}
        .appState="${this.appState}"
      ></grampsjs-view-notes>
      <grampsjs-view-media-objects
        class="page"
        ?active=${this.appState.path.page === 'medialist'}
        .appState="${this.appState}"
      ></grampsjs-view-media-objects>

      <grampsjs-view-dna-matches
        class="page"
        ?active=${['dna-matches', 'dna-chromosome'].includes(
          this.appState.path.page
        )}
        .appState="${this.appState}"
        homePersonGrampsId="${this.homePersonDetails?.gramps_id ?? ''}"
        grampsId="${this.appState.path.pageId}"
        grampsIdMatch="${this.appState.path.pageId2}"
        ?matches="${this.appState.path.page === 'dna-matches'}"
        ?chromosome="${this.appState.path.page === 'dna-chromosome'}"
      ></grampsjs-view-dna-matches>

      <grampsjs-view-map
        class="page"
        ?active=${this.appState.path.page === 'map'}
        .appState="${this.appState}"
      ></grampsjs-view-map>
      <grampsjs-view-tree
        class="page"
        ?active=${this.appState.path.page === 'tree'}
        grampsId="${this.settings.homePerson}"
        .appState="${this.appState}"
        .settings="${this.settings}"
      ></grampsjs-view-tree>
      <grampsjs-view-person
        class="page"
        ?active=${this.appState.path.page === 'person'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
        .homePersonDetails=${this.homePersonDetails}
      ></grampsjs-view-person>
      <grampsjs-view-family
        class="page"
        ?active=${this.appState.path.page === 'family'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-family>
      <grampsjs-view-event
        class="page"
        ?active=${this.appState.path.page === 'event'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-event>
      <grampsjs-view-place
        class="page"
        ?active=${this.appState.path.page === 'place'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-place>
      <grampsjs-view-source
        class="page"
        ?active=${this.appState.path.page === 'source'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-source>
      <grampsjs-view-citation
        class="page"
        ?active=${this.appState.path.page === 'citation'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-citation>
      <grampsjs-view-repository
        class="page"
        ?active=${this.appState.path.page === 'repository'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-repository>
      <grampsjs-view-note
        class="page"
        ?active=${this.appState.path.page === 'note'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-note>
      <grampsjs-view-media
        class="page"
        ?active=${this.appState.path.page === 'media'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
        .dbInfo="${this.dbInfo}"
      ></grampsjs-view-media>
      ${this.canUseChat
        ? html`
            <grampsjs-view-chat
              class="page"
              ?active=${this.appState.path.page === 'chat'}
              .appState="${this.appState}"
            ></grampsjs-view-chat>
          `
        : ''}
      <grampsjs-view-export
        class="page"
        ?active=${this.appState.path.page === 'export'}
        .appState="${this.appState}"
      ></grampsjs-view-export>
      <grampsjs-view-reports
        class="page"
        ?active=${this.appState.path.page === 'reports'}
        .appState="${this.appState}"
      ></grampsjs-view-reports>
      <grampsjs-view-search
        class="page"
        ?active=${this.appState.path.page === 'search'}
        .appState="${this.appState}"
        .dbInfo="${this.dbInfo}"
      ></grampsjs-view-search>
      <grampsjs-view-recent
        class="page"
        ?active=${this.appState.path.page === 'recent'}
        .appState="${this.appState}"
      ></grampsjs-view-recent>
      <grampsjs-view-bookmarks
        class="page"
        ?active=${this.appState.path.page === 'bookmarks'}
        .appState="${this.appState}"
      ></grampsjs-view-bookmarks>
      <grampsjs-view-tasks
        class="page"
        ?active=${this.appState.path.page === 'tasks'}
        .appState="${this.appState}"
      ></grampsjs-view-tasks>
      <grampsjs-view-settings-user
        class="page"
        ?active=${this.appState.path.page === 'settings' &&
        (this.appState.path.pageId === 'user' || !this.appState.path.pageId)}
        .appState="${this.appState}"
      ></grampsjs-view-settings-user>
      <grampsjs-view-admin-settings
        class="page"
        ?active=${this.appState.path.page === 'settings' &&
        this.appState.path.pageId === 'administration'}
        .appState="${this.appState}"
      ></grampsjs-view-admin-settings>
      <grampsjs-view-user-management
        class="page"
        ?active=${this.appState.path.page === 'settings' &&
        this.appState.path.pageId === 'users'}
        .appState="${this.appState}"
      ></grampsjs-view-user-management>
      <grampsjs-view-sysinfo
        class="page"
        ?active=${this.appState.path.page === 'settings' &&
        this.appState.path.pageId === 'info'}
        .appState="${this.appState}"
      ></grampsjs-view-sysinfo>
      <grampsjs-view-report
        class="page"
        ?active=${this.appState.path.page === 'report'}
        .appState="${this.appState}"
        reportId="${this.appState.path.pageId}"
      ></grampsjs-view-report>
      ${this.appState.permissions.canViewPrivate
        ? html`
            <grampsjs-view-revisions
              class="page"
              ?active=${this.appState.path.page === 'revisions'}
              .appState="${this.appState}"
            ></grampsjs-view-revisions>
          `
        : ''}
      <grampsjs-view-revision
        class="page"
        transactionId="${this.appState.path.pageId}"
        ?active=${this.appState.path.page === 'revision'}
        .appState="${this.appState}"
      ></grampsjs-view-revision>

      <grampsjs-view-new-person
        class="page"
        ?active=${this.appState.path.page === 'new_person'}
        .appState="${this.appState}"
      ></grampsjs-view-new-person>
      <grampsjs-view-new-family
        class="page"
        ?active=${this.appState.path.page === 'new_family'}
        .appState="${this.appState}"
      ></grampsjs-view-new-family>
      <grampsjs-view-new-event
        class="page"
        ?active=${this.appState.path.page === 'new_event'}
        .appState="${this.appState}"
      ></grampsjs-view-new-event>
      <grampsjs-view-new-place
        class="page"
        ?active=${this.appState.path.page === 'new_place'}
        .appState="${this.appState}"
      ></grampsjs-view-new-place>
      <grampsjs-view-new-source
        class="page"
        ?active=${this.appState.path.page === 'new_source'}
        .appState="${this.appState}"
      ></grampsjs-view-new-source>
      <grampsjs-view-new-citation
        class="page"
        ?active=${this.appState.path.page === 'new_citation'}
        .appState="${this.appState}"
      ></grampsjs-view-new-citation>
      <grampsjs-view-new-repository
        class="page"
        ?active=${this.appState.path.page === 'new_repository'}
        .appState="${this.appState}"
      ></grampsjs-view-new-repository>
      <grampsjs-view-new-note
        class="page"
        ?active=${this.appState.path.page === 'new_note'}
        .appState="${this.appState}"
      ></grampsjs-view-new-note>
      <grampsjs-view-new-media
        class="page"
        ?active=${this.appState.path.page === 'new_media'}
        .appState="${this.appState}"
      ></grampsjs-view-new-media>
      <grampsjs-view-new-task
        class="page"
        ?active=${this.appState.path.page === 'new_task'}
        .appState="${this.appState}"
      ></grampsjs-view-new-task>
      <grampsjs-view-task
        class="page"
        ?active=${this.appState.path.page === 'task'}
        grampsId="${this.appState.path.pageId}"
        .appState="${this.appState}"
      ></grampsjs-view-task>
    `
  }
}

window.customElements.define('grampsjs-pages', GrampsjsPages)
