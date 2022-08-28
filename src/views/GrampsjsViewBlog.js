import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsBlogPost.js'
import {apiGet} from '../api.js'

const BASE_DIR = ''

export class GrampsjsViewBlog extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .muted {
          opacity: 0.4;
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
    this._pageSize = 1
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
      ${this._dataSources.map(
        (source, i) => this.renderPost(source, this._dataNotes[i]),
        this
      )}
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
  renderPost(source, note) {
    return html`
      <grampsjs-blog-post
        .source="${source}"
        .note="${note}"
        .strings="${this.strings}"
      ></grampsjs-blog-post>
    `
  }

  firstUpdated() {
    this._fetchData()
  }

  _getNotesUrl() {
    const grampsIds = this._dataSources
      .map(obj => obj?.extended?.notes[0]?.gramps_id)
      .filter(obj => obj)
    if (grampsIds.length === 0) {
      return ''
    }
    const rules = {
      function: 'or',
      rules: grampsIds.map(grampsId => ({
        name: 'HasIdOf',
        values: [grampsId],
      })),
    }
    const options = {
      link_format: `${BASE_DIR}/{obj_class}/{gramps_id}`,
    }
    return `/api/notes/?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&extend=all&formats=html&rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&format_options=${encodeURIComponent(JSON.stringify(options))}`
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
    const uriNotes = this._getNotesUrl()
    if (uriNotes) {
      await apiGet(uriNotes).then(data => {
        if ('data' in data) {
          this.error = false
          this._dataNotes = this._dataSources.map(obj => {
            const noteGrampsId = obj?.extended?.notes[0]?.gramps_id
            if (!noteGrampsId) {
              return {}
            }
            return data.data.find(note => note.gramps_id === noteGrampsId) || {}
          })
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
    this.loading = false
    this._firstLoaded = true
  }
}

window.customElements.define('grampsjs-view-blog', GrampsjsViewBlog)
