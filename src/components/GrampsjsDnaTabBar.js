/* eslint-disable class-methods-use-this */

import {css, html, LitElement} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import {sharedStyles} from '../SharedStyles.js'

const tabs = {
  'dna-matches': 'Matches',
  'dna-chromosome': 'Chromosome Browser',
  ydna: 'Y-DNA',
}

class GrampsjsDnaTabBar extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-tabs {
          margin: 20px;
          margin-bottom: 40px;
          width: max-content;
          max-width: 100%;
        }

        md-primary-tab {
          flex: 0 0 auto;
          width: auto;
        }
      `,
    ]
  }

  render() {
    if (!(this.appState.path.page in tabs)) {
      return ''
    }
    const currentKey = this.appState.path.page
    return html`
      <md-tabs .activeTabIndex=${Object.keys(tabs).indexOf(currentKey)}>
        ${Object.keys(tabs).map(
          key => html`
            <md-primary-tab
              @click=${() =>
                this._goTo(
                  this.appState?.path?.pageId
                    ? `${key}/${this.appState?.path?.pageId}`
                    : key
                )}
            >
              ${this._(tabs[key])}
            </md-primary-tab>
          `
        )}
      </md-tabs>
      ${this.page}
    `
  }

  _goTo(path) {
    fireEvent(this, 'nav', {path})
  }
}

window.customElements.define('grampsjs-dna-tab-bar', GrampsjsDnaTabBar)
