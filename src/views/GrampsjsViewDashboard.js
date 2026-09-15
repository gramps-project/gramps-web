import {html, css} from 'lit'

import '@material/web/button/text-button'
import '@material/web/button/outlined-button'

import {GrampsjsView} from './GrampsjsView.js'
import './GrampsjsViewRecentlyChanged.js'
import './GrampsjsViewRecentBlogPosts.js'
import './GrampsjsViewAnniversaries.js'
import '../components/GrampsjsHomePerson.js'
import '../components/GrampsjsStatistics.js'
import '../components/GrampsjsConnectedNote.js'
import '../components/GrampsjsImg.js'
import {
  TREE_CONFIG_HOME_PAGE_NOTE,
  TREE_CONFIG_HOME_PAGE_IMAGE,
} from '../api.js'

export class GrampsjsViewDashboard extends GrampsjsView {
  static get properties() {
    return {
      dbInfo: {type: Object},
      homePersonDetails: {type: Object},
      homePersonMissing: {type: Boolean},
      homePersonGrampsId: {type: String},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
    this.homePersonDetails = {}
    this.homePersonMissing = false
    this.homePersonGrampsId = ''
  }

  static get styles() {
    return [
      super.styles,
      css`
        .column {
          float: left;
          width: 50%;
          overflow-x: hidden;
        }

        .column:first-child {
          width: calc(50% - 2em);
          padding-right: 2em;
        }

        .column > div {
          margin-bottom: 1.5em;
        }

        .buttons {
          display: flex;
          gap: 1em;
          margin-top: 1em;
          flex-wrap: wrap;
        }

        .home-page-block {
          width: 100%;
          margin-top: 2em;
          margin-bottom: 1em;
          overflow: hidden;
          clear: both;
        }

        .home-page-block:not(.home-page-block-combined) {
          padding-left: 1em;
          box-sizing: border-box;
        }

        .home-page-block-combined {
          display: flex;
          gap: 3em;
          align-items: center;
        }

        .home-page-block-combined .home-page-image {
          flex: 0 0 auto;
          margin-top: 1em;
        }

        .home-page-block-combined .home-page-note {
          flex: 1;
          min-width: 0;
        }

        .home-page-image-only {
          display: flex;
          justify-content: center;
          margin-top: 1em;
          margin-bottom: 1.5em;
        }

        @media screen and (max-width: 768px) {
          .column,
          .column:first-child {
            width: 100%;
            padding-right: 0;
          }

          .home-page-block-combined {
            flex-direction: column;
          }

          .home-page-block-combined .home-page-image {
            flex: unset;
            width: 100%;
          }
        }
      `,
    ]
  }

  _renderHomePageBlock() {
    const noteHandle =
      this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE] ?? ''
    const imageHandle =
      this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE] ?? ''

    if (!noteHandle) return html``

    if (imageHandle) {
      return html`
        <div class="home-page-block home-page-block-combined">
          <div class="home-page-image">
            <grampsjs-img
              handle="${imageHandle}"
              size="300"
              displayHeight="180"
            ></grampsjs-img>
          </div>
          <div class="home-page-note">
            <grampsjs-connected-note
              handle="${noteHandle}"
              .framed="${false}"
              .appState="${this.appState}"
            ></grampsjs-connected-note>
          </div>
        </div>
      `
    }

    return html`
      <div class="home-page-block">
        <grampsjs-connected-note
          handle="${noteHandle}"
          .framed="${false}"
          .appState="${this.appState}"
        ></grampsjs-connected-note>
      </div>
    `
  }

  _renderHomePageImage() {
    const noteHandle =
      this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_NOTE] ?? ''
    const imageHandle =
      this.appState.treeConfig?.[TREE_CONFIG_HOME_PAGE_IMAGE] ?? ''

    if (!imageHandle || noteHandle) return html``

    return html`
      <div class="home-page-image-only">
        <grampsjs-img
          handle="${imageHandle}"
          size="300"
          displayHeight="200"
        ></grampsjs-img>
      </div>
    `
  }

  // True while the tree holds no objects of any kind, so the dashboard can drop
  // the panels that would render as a row of blanks.
  get _treeIsEmpty() {
    const counts = this.appState.dbInfo?.object_counts
    if (!counts) {
      return false
    }
    return Object.values(counts).every(count => !count)
  }

  // Onboarding guidance that advances with the tree: create the first person,
  // then connect people into families. It ends once families exist.
  _renderGetStarted() {
    const counts = this.appState.dbInfo?.object_counts
    if (!counts || !this.appState.permissions.canEdit) {
      return ''
    }
    if (counts.people === 0) {
      return this._renderGetStartedCard(
        this._(
          'To start building your family tree, add yourself as a person or import a family tree file.'
        ),
        html`
          <md-outlined-button href="/new_person"
            >${this._('New Person')}</md-outlined-button
          >
          ${this.appState.permissions.canManageUsers
            ? html`<md-outlined-button href="/settings/administration"
                >${this._('Import Family Tree')}</md-outlined-button
              >`
            : ''}
        `
      )
    }
    if (!counts.families) {
      return this._renderGetStartedCard(
        this._('Connect the people in your tree by adding a family.'),
        html`<md-outlined-button href="/new_family"
          >${this._('New Family')}</md-outlined-button
        >`
      )
    }
    return ''
  }

  _renderGetStartedCard(text, buttons) {
    return html`
      <div>
        <h3>${this._('Get started')}</h3>
        <p>${text}</p>
        <div class="buttons">${buttons}</div>
      </div>
    `
  }

  renderContent() {
    return html`
      ${this._renderHomePageBlock()}
      <div class="column">
        ${this._renderGetStarted()}
        ${this.appState.dbInfo?.object_counts?.people || this.homePersonGrampsId
          ? html`
              <div>
                <grampsjs-home-person
                  id="homeperson"
                  .appState="${this.appState}"
                  .homePersonDetails=${this.homePersonDetails}
                  .homePersonMissing=${this.homePersonMissing}
                  .homePersonGrampsId=${this.homePersonGrampsId}
                >
                </grampsjs-home-person>
              </div>
            `
          : ''}
        ${this.appState.dbInfo?.object_counts?.events
          ? html`
              <div>
                <grampsjs-view-anniversaries
                  id="anniversaries"
                  .appState="${this.appState}"
                >
                </grampsjs-view-anniversaries>
              </div>
            `
          : ''}
        ${this._treeIsEmpty
          ? ''
          : html`
              <div>
                <grampsjs-view-recently-changed
                  id="recently-changed"
                  .appState="${this.appState}"
                >
                </grampsjs-view-recently-changed>
              </div>
            `}
      </div>
      <div class="column">
        ${this._renderHomePageImage()}
        ${this._treeIsEmpty
          ? ''
          : html`
              <div>
                <grampsjs-view-recent-blog-posts
                  id="recent-blog"
                  .appState="${this.appState}"
                >
                </grampsjs-view-recent-blog-posts>
              </div>
              <div>
                <grampsjs-statistics
                  .data="${this.dbInfo?.object_counts || {}}"
                  id="statistics"
                  .appState="${this.appState}"
                >
                </grampsjs-statistics>
              </div>
            `}
      </div>
    `
  }
}

window.customElements.define('grampsjs-view-dashboard', GrampsjsViewDashboard)
