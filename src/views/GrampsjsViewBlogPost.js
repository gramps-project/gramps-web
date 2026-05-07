import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsBlogPost.js'

const BASE_DIR = ''

export class GrampsjsViewBlogPost extends GrampsjsView {
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
      grampsId: {type: String},
      _dataSources: {type: Array},
      _dataNotes: {type: Array},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this._dataSources = []
    this._dataNotes = []
    this._firstLoaded = false
  }

  renderContent() {
    return html` ${this.renderPosts()} `
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

  // eslint-disable-next-line no-dupe-class-members
  renderPost(source, note) {
    return html`
      <grampsjs-blog-post
        .source="${source}"
        .note="${note}"
        .appState="${this.appState}"
      ></grampsjs-blog-post>
    `
  }

  firstUpdated() {
    this._fetchData()
  }

  _getNotesUrl() {
    const grampsId = this._dataSources[0]?.extended?.notes[0]?.gramps_id
    if (!grampsId) {
      return ''
    }
    const options = {
      link_format: `${BASE_DIR}/{obj_class}/{gramps_id}`,
    }
    return `/api/notes/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&extend=all&formats=html&gramps_id=${grampsId}&format_options=${encodeURIComponent(
      JSON.stringify(options)
    )}`
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('grampsId')) {
      this._fetchData()
    }
    if (
      changed.has('active') &&
      this.active &&
      !this.loading &&
      this.grampsId !== this._dataSources[0]?.gramps_id
    ) {
      this._fetchData()
    }
  }

  async _fetchData() {
    this.loading = true
    const uri = `/api/sources/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
    await this.appState.apiGet(uri).then(data => {
      if ('data' in data) {
        this.error = false
        this._dataSources = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
    const uriNotes = this._getNotesUrl()
    if (uriNotes) {
      await this.appState.apiGet(uriNotes).then(data => {
        if ('data' in data) {
          this.error = false
          this._dataNotes = data.data
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

window.customElements.define('grampsjs-view-blog-post', GrampsjsViewBlogPost)
