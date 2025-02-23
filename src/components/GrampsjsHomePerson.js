import {LitElement, css, html} from 'lit'

import '@material/web/button/text-button'
import {mdiPencil} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsSearchResultList.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsHomePerson extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          margin-bottom: 15px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
      homePersonGrampsId: {type: String},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
    this.homePersonGrampsId = ''
  }

  render() {
    return html`
      <h3>${this._('Home Person')}</h3>

      ${this.homePersonGrampsId
        ? html`
            <div class="content">
              <grampsjs-search-result-list
                large
                linked
                metaIcon="edit"
                .appState="${this.appState}"
                .data=${[
                  {object: this.homePersonDetails, object_type: 'person'},
                ]}
                @search-result:metaClicked="${this._handleMetaClick}"
              >
              </grampsjs-search-result-list>
            </div>
          `
        : html` <md-text-button trailing-icon @click="${this._handleMetaClick}">
            ${this._('Set _Home Person')}
            <svg viewBox="0 0 24 24" slot="icon">
              <path d="${mdiPencil}" />
            </svg>
          </md-text-button>`}
    `
  }

  _handleMetaClick() {
    fireEvent(this, 'nav', {path: 'settings'})
  }
}

window.customElements.define('grampsjs-home-person', GrampsjsHomePerson)
