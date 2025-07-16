import {html, css} from 'lit'

import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import '../components/GrampsjsSearchResultList.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewRecentBlogPosts extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        .change {
          font-size: 0.8em;
          color: rgba(0, 0, 0, 0.5);
          margin-top: 0.3em;
        }

        h3 {
          margin-bottom: 15px;
        }
      `,
    ]
  }

  renderContent() {
    if (!this._data?.data?.length) {
      return html`
        <h3>${this._('Latest Blog Post')}</h3>
        <p>${this._('None')}.</p>
      `
    }
    return html`
      <h3>${this._('Latest Blog Post')}</h3>
      <grampsjs-search-result-list
        large
        selectable
        @search-result:clicked="${this._handleClick}"
        .data="${this._data.data.slice(0, 1).map(obj => ({
          object: obj,
          object_type: 'source',
        }))}"
        .appState="${this.appState}"
        date
        noSep
      >
      </grampsjs-search-result-list>
    `
  }

  renderLoading() {
    return html`
      <h3>${this._('Latest Blog Post')}</h3>
      <grampsjs-search-result-list
        .data="${this._data.data}"
        .appState="${this.appState}"
        loading
        numberLoading="1"
        noSep
      ></grampsjs-search-result-list>
    `
  }

  _handleClick(event) {
    const grampsId = event?.detail?.object?.gramps_id
    if (grampsId) {
      fireEvent(this, 'nav', {path: `blog/${grampsId}`})
    }
  }

  getUrl() {
    const rules = {
      rules: [
        {
          name: 'HasTag',
          values: ['Blog'],
        },
      ],
    }
    return `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&pagesize=1&sort=-change&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all`
  }
}

window.customElements.define(
  'grampsjs-view-recent-blog-posts',
  GrampsjsViewRecentBlogPosts
)
