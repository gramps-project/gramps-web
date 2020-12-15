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
    ${this.data.map((obj) => {
    return html`
        <div class="search-hit">
          ${showObject(obj.object_type, obj.object)}
        </div>`
  }, this)}
    </div>
    `
  }


  _renderObj(obj) {
    if (obj.object_type === 'person') {
      return this._renderPerson(obj.object)
    }
    if (obj.object_type === 'event') {
      return this._renderEvent(obj.object)
    }
    if (obj.object_type === 'place') {
      return this._renderPlace(obj.object)
    }
    return html`
    ${obj.object_type}

    <pre>${JSON.stringify(obj.object, null, 2)}</pre>
    `
  }

  _renderPerson(obj) {
    return html`
    <a href="/person/${obj.gramps_id}">${obj.profile.name_given} ${obj.profile.name_surname}</a>
    ${Object.keys(obj.profile.birth).length ? html`
    <br><span class="small">* ${obj.profile.birth.date}</span>` : ''}
    `
  }

  _renderEvent(obj) {
    return html`
    <a href="/event/${obj.gramps_id}">${obj.description}</a>
    ${obj.profile.date ? html`
    <br><span class="small">${obj.profile.date}</span>` : ''}`
  }

  _renderPlace(obj) {
    return html`
    <a href="/place/${obj.gramps_id}">${obj.title}</a>`
  }

}


window.customElements.define('grampsjs-search-results', GrampsjsSearchResults)
