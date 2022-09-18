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

        h2 {
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
      <h2>${this._('Home Person')}</h2>

      <div class="content">
        <grampsjs-search-result-list
          selectable
          metaIcon="edit"
          .strings=${this.strings}
          .data=${[{object: this.homePersonDetails, object_type: 'person'}]}
          @search-result:clicked="${this._handleClick}"
          @search-result:metaClicked="${this._handleMetaClick}"
        >
        </grampsjs-search-result-list>
      </div>
    `
  }

  _handleClick() {
    if (this.homePersonDetails.gramps_id) {
      fireEvent(this, 'nav', {
        path: `person/${this.homePersonDetails.gramps_id}`,
      })
    }
  }

  _handleMetaClick() {
    fireEvent(this, 'nav', {path: 'settings'})
  }
}

window.customElements.define('grampsjs-home-person', GrampsjsHomePerson)
