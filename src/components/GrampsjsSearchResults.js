import {LitElement, css, html} from 'lit-element'

import {sharedStyles} from '../SharedStyles.js'
import {showObject} from '../util.js'


export class GrampsjsSearchResults extends LitElement {

  static get styles() {
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
        `
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      strings: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = []
    this.strings = {}
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    return html`
    <div id="search-results">
    ${this.data.map((obj) =>  html`
        <div class="search-hit">
          ${showObject(obj.object_type, obj.object, this.strings)}
        </div>`, this)}
    </div>
    `
  }
}


window.customElements.define('grampsjs-search-results', GrampsjsSearchResults)
