import {html, css} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTimedelta'
import {apiGet} from '../api.js'

const BASE_DIR = ''

export class GrampsjsViewRecentBlogPosts extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
        margin: 0;
      }

      .change {
        font-size: 0.8em;
        color: rgba(0, 0, 0, 0.5);
        margin-top: 0.3em;
      }
      `
    ]
  }

  static get properties () {
    return {
      data: {type: Array}
    }
  }

  constructor () {
    super()
    this.data = []
  }

  renderContent () {
    if (this.data.length === 0) {
      return ''
    }
    return html`
    <h2>${this._('Latest Blog Post')}</h2>
    ${this.data.map(obj => this._renderPost(obj))}
    `
  }

  _renderPost (obj) {
    return html`
    <a href="${BASE_DIR}/blog/">${obj.title}</a><br>
      <div class="change"
        ><grampsjs-timedelta
          timestamp="${obj.change}"
          locale="${this.strings.__lang__}"
        ></grampsjs-timedelta></div>
    `
  }

  async _fetchData (lang) {
    this.loading = true
    const rules = {
      rules: [
        {
          name: 'HasTag',
          values: ['Blog']
        }
      ]
    }
    const uri = `/api/sources/?rules=${encodeURIComponent(JSON.stringify(rules))}&pagesize=1&sort=-change&locale=${lang || 'en'}&profile=all&extend=all`
    await apiGet(uri).then(data => {
      if ('data' in data) {
        this.error = false
        this.data = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
    this.loading = false
  }

  firstUpdated () {
    if ('__lang__' in this.strings) { // don't load before we have strings
      this._fetchData(this.strings.__lang__)
    }
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('language:changed', (e) => this._fetchData(e.detail.lang))
    window.addEventListener('db:changed', () => this._fetchData(this.strings.__lang__))
  }
}

window.customElements.define('grampsjs-view-recent-blog-posts', GrampsjsViewRecentBlogPosts)
