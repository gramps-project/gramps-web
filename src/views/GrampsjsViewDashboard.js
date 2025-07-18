import {html, css} from 'lit'

import '@material/web/button/text-button'
import '@material/web/button/outlined-button'

import {GrampsjsView} from './GrampsjsView.js'
import './GrampsjsViewRecentlyChanged.js'
import './GrampsjsViewRecentBlogPosts.js'
import './GrampsjsViewAnniversaries.js'
import '../components/GrampsjsHomePerson.js'
import '../components/GrampsjsStatistics.js'

export class GrampsjsViewDashboard extends GrampsjsView {
  static get properties() {
    return {
      dbInfo: {type: Object},
      homePersonDetails: {type: Object},
      homePersonGrampsId: {type: String},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
    this.homePersonDetails = {}
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

        @media screen and (max-width: 768px) {
          .column,
          .column:first-child {
            width: 100%;
            padding-right: 0;
          }
        }
      `,
    ]
  }

  renderContent() {
    return html`
      <div class="column">
        ${this.appState.dbInfo?.object_counts?.people === 0 &&
        this.appState.permissions.canEdit
          ? html`
              <div>
                <h3>Get started</h3>
                <p>
                  ${this._(
                    'To start building your family tree, add yourself as a person or import a family tree file.'
                  )}
                </p>
                <div class="buttons">
                  <md-outlined-button href="/new_person"
                    >${this._('New Person')}</md-outlined-button
                  ><md-outlined-button href="/settings/administration"
                    >${this._('Import Family Tree')}</md-outlined-button
                  >
                </div>
              </div>
            `
          : ''}
        ${this.appState.dbInfo?.object_counts?.people
          ? html`
              <div>
                <grampsjs-home-person
                  id="homeperson"
                  .appState="${this.appState}"
                  .homePersonDetails=${this.homePersonDetails}
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
        <div>
          <grampsjs-view-recently-changed
            id="recently-changed"
            .appState="${this.appState}"
          >
          </grampsjs-view-recently-changed>
        </div>
      </div>
      <div class="column">
        <div>
          <grampsjs-view-recent-blog-posts
            ?active=${this.active}
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
      </div>
    `
  }
}

window.customElements.define('grampsjs-view-dashboard', GrampsjsViewDashboard)
