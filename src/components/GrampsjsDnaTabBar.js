/* eslint-disable class-methods-use-this */

import {css, html, LitElement} from 'lit'

import '@material/web/tabs/tabs'
import '@material/web/tabs/primary-tab'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, handleAppLinkClick} from '../util.js'
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

        md-primary-tab a:link,
        md-primary-tab a:visited,
        md-primary-tab a:hover {
          color: inherit;
          text-decoration: none;
        }

        /* The link covers the whole tab, so that the browser offers to open the
           page in a new tab anywhere in it. The tab has 16px padding beside the
           content, which is the containing block of the link. */
        md-primary-tab a::after {
          content: '';
          position: absolute;
          inset: 0 -16px;
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
            <md-primary-tab @click=${() => this._goTo(this._getPath(key))}>
              <a
                href="/${this._getPath(key)}"
                tabindex="-1"
                @click=${e => this._handleLinkClick(e, key)}
                >${this._(tabs[key])}</a
              >
            </md-primary-tab>
          `
        )}
      </md-tabs>
      ${this.page}
    `
  }

  // The tab clicks itself again for clicks on its content, without the
  // modifier keys of the click, so the link handles its clicks alone
  _handleLinkClick(e, key) {
    e.stopPropagation()
    handleAppLinkClick(e, this._getPath(key))
  }

  _goTo(path) {
    fireEvent(this, 'nav', {path})
  }

  _getPath(key) {
    const {pageId} = this.appState?.path ?? {}
    return pageId ? `${key}/${pageId}` : key
  }
}

window.customElements.define('grampsjs-dna-tab-bar', GrampsjsDnaTabBar)
