import {LitElement, css, html} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsSearchResultList.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {fireEvent} from '../util.js'

export class GrampsjsHomePerson extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .content {
          padding-right: 20px;
        }

        h3 {
          margin-bottom: 15px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      homePersonDetails: {type: Object},
    }
  }

  constructor() {
    super()
    this.homePersonDetails = {}
  }

  render() {
    return html`
      <h3>${this._('Home Person')}</h3>

      <div class="content">
        <grampsjs-search-result-list
          large
          linked
          metaIcon="edit"
          .strings=${this.strings}
          .data=${[{object: this.homePersonDetails, object_type: 'person'}]}
          @search-result:metaClicked="${this._handleMetaClick}"
        >
        </grampsjs-search-result-list>
      </div>
    `
  }

  _handleMetaClick() {
    fireEvent(this, 'nav', {path: 'settings'})
  }
}

window.customElements.define('grampsjs-home-person', GrampsjsHomePerson)
