import {html, css} from 'lit'

import {GrampsjsConnectedComponent} from '../components/GrampsjsConnectedComponent.js'
import '../components/GrampsjsSearchResultList.js'

export class GrampsjsViewRecentBlogPosts extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        .change {
          font-size: 0.8em;
          color: var(--grampsjs-body-font-color-50);
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
        linked
        .data="${this._data.data.slice(0, 1).map(obj => ({
          object: obj,
          object_type: 'source',
          path: `blog/${obj.gramps_id}`,
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
