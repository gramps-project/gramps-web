import {LitElement, css, html} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {showObject} from '../util.js'
import './GrampsjsTimedelta.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

export class GrampsjsSearchResults extends GrampsjsTranslateMixin(LitElement) {
  static get styles () {
    return [
      sharedStyles,
      css`
        .search-hit {
          margin-bottom: 1.2em;
        }

        .small {
          font-size: 0.8em;
        }

        .paging {
          text-align: center;
          padding-right: 1em;
          line-height: 48px;
        }

        .paging span {
          color: rgba(0, 0, 0, 0.9);
          padding: 0 0.5em;
        }

        .change {
          font-size: 0.8em;
          color: rgba(0, 0, 0, 0.5);
          margin-top: 0.2em;
          margin-left: 33px;
        }
        `
    ]
  }

  static get properties () {
    return {
      data: {type: Array},
      date: {type: Boolean},
      loading: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.data = []
    this.date = false
    this.loading = false
  }

  render () {
    if (this.loading) {
      return html`
      <div id="search-results">
      ${[1, 2].map(() => html`
          <div class="search-hit">
            <span class="skeleton" style="width:15em;">&nbsp;</span>
            <div class="change"><span class="skeleton" style="width:7em;">&nbsp;</span></div>
          </div>`, this)}
      </div>
      `
    } if (this.data.length === 0) {
      return html``
    }
    return html`
    <div id="search-results">
    ${this.data.map((obj) => html`
        <div class="search-hit">
          ${showObject(obj.object_type, obj.object, this.strings)}
          ${this.date
    ? html`<div class="change"><grampsjs-timedelta
            timestamp="${obj.object.change}"
            locale="${this.strings.__lang__}"
          ></grampsjs-timedelta></div>`
    : ''}
        </div>`, this)}
    </div>
    `
  }
}

window.customElements.define('grampsjs-search-results', GrampsjsSearchResults)
