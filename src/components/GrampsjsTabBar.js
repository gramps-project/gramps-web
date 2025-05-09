import {html, css, LitElement} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'

import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const tabs = {
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  sources: 'Sources',
  citations: 'Citations',
  repositories: 'Repositories',
  notes: 'Notes',
  medialist: 'Media Objects',
  settings: {
    user: 'User settings',
    administration: 'Administration',
    users: 'Manage users',
    info: 'System Information',
  },
}

class GrampsjsTabBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-select {
          width: 100%;
          max-width: 30em;
          margin-bottom: 10px;
        }

        md-tabs {
          margin: 20px;
          width: max-content;
          max-width: 100%;
        }

        md-primary-tab {
          flex: 0 0 auto;
          width: auto;
        }

        .medium {
          font-weight: 500;
          color: rgb(0.05, 0.05, 0.05);
        }
      `,
    ]
  }

  render() {
    const currentKey = this.appState.path.pageId || this.appState.path.page
    if (!(this.appState.path.page in tabs)) {
      return ''
    }
    if (
      this.appState.path.pageId &&
      this.appState.path.page in tabs &&
      !(this.appState.path.pageId in tabs[this.appState.path.page])
    ) {
      return ''
    }
    let currentTabs
    if (!this.appState.path.pageId) {
      currentTabs = Object.fromEntries(
        Object.entries(tabs).filter(([, value]) => typeof value === 'string')
      )
    } else {
      currentTabs = tabs[this.appState.path.page]
    }
    return html`
      <md-tabs .activeTabIndex=${Object.keys(currentTabs).indexOf(currentKey)}>
        ${Object.keys(currentTabs).map(
          key =>
            html`
              <md-primary-tab @click="${() => this._goTo(key)}"
                >${this._(currentTabs[key])}</md-primary-tab
              >
            `
        )}
      </md-tabs>
    `
  }

  _goTo(key) {
    if (this.appState.path.pageId) {
      fireEvent(this, 'nav', {path: `${this.appState.path.page}/${key}`})
    } else {
      fireEvent(this, 'nav', {path: key})
    }
  }
}

window.customElements.define('grampsjs-tab-bar', GrampsjsTabBar)
