import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsBlogPostPreview.js'
import {apiGet} from '../api.js'
import {fireEvent, clickKeyHandler} from '../util.js'

export class GrampsjsViewBlog extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .muted {
          opacity: 0.4;
        }

        #posts {
          display: grid;
          gap: 1em;
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
        }

        .post {
          padding: 0.8em 1em;
          cursor: pointer;
          outline: 2px solid rgba(0, 0, 0, 0);
          transition: outline-color 0.3s ease-in;
        }

        .post:focus,
        .post:focus-within {
          outline: 2px solid rgba(0, 0, 0, 0.1);
          border-radius: 5px;
        }

        .post > div {
        }

        @media (max-width: 768px) {
          #posts {
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      _dataSources: {type: Array},
      _dataNotes: {type: Array},
      _totalCount: {type: Number},
      _page: {type: Number},
      _pages: {type: Number},
    }
  }

  constructor() {
    super()
    this._dataSources = []
    this._dataNotes = []
    this._page = 1
    this._pageSize = 6
    this._firstLoaded = false
    this._totalCount = -1
    this._pages = -1
  }

  renderContent() {
    return html`
      ${this.renderPosts()}
      ${this._totalCount > 0 ? this.renderPagination() : ''}
    `
  }

  renderPosts() {
    if (this._firstLoaded && this._dataSources.length === 0) {
      return html`
        <h2>${this._('Blog')}</h2>
        <p class="muted">
          ${this._("To start using the blog, add a source with tag 'Blog'.")}
        </p>
      `
    }
    if (this.loading) {
      return html``
    }
    return html`
      <div id="posts">
        ${this._dataSources.map(
          (source, i) => this.renderPost(source, this._dataNotes[i]),
          this
        )}
      </div>
    `
  }

  renderPagination() {
    return html`
      <grampsjs-pagination
        page="${this._page}"
        pages="${this._pages}"
        @page:changed="${this._handlePageChanged}"
        .strings="${this.strings}"
      ></grampsjs-pagination>
    `
  }

  _handlePageChanged(event) {
    this._page = event.detail.page
    this._fetchData()
  }

  // eslint-disable-next-line no-dupe-class-members
  renderPost(source) {
    return html`
      <div
        class="post"
        tabindex="0"
        @click="${() => this._handlePreviewClick(source.gramps_id)}"
        @keydown="${clickKeyHandler}"
      >
        <div>
          <grampsjs-blog-post-preview
            .data="${source}"
            .strings="${this.strings}"
          ></grampsjs-blog-post-preview>
        </div>
      </div>
    `
  }

  firstUpdated() {
    this._fetchData()
  }

  _handlePreviewClick(grampsId) {
    fireEvent(this, 'nav', {path: `blog/${grampsId}`})
  }

  async _fetchData() {
    this.loading = true
    const rules = {
      rules: [
        {
          name: 'HasTag',
          values: ['Blog'],
        },
      ],
    }
    const uri = `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&page=${this._page}&pagesize=${this._pageSize}&sort=-change&locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&extend=all`
    await apiGet(uri).then(data => {
      if ('data' in data) {
        this.error = false
        this._dataSources = data.data
        this._totalCount = data.total_count
        this._pages = Math.ceil(this._totalCount / this._pageSize)
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
    this.loading = false
    this._firstLoaded = true
  }
}

window.customElements.define('grampsjs-view-blog', GrampsjsViewBlog)
