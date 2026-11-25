import {html, css} from 'lit'

import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'
import {mdiClose, mdiContentSave} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsBlogPostForm.js'
import '../components/GrampsjsIcon.js'

import {fireEvent} from '../util.js'
import {clearTagCache, fetchAllTags} from '../tags.js'
import {blogMediaRequests, isIsoDate, newBlogPostObjects} from '../blog.js'

export class GrampsjsViewNewBlogPost extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        div.spacer {
          margin-top: 2em;
        }

        p.right {
          text-align: right;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _blogTagHandle: {type: String},
      _isSaving: {type: Boolean},
      _isFormValid: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._blogTagHandle = ''
    this._isSaving = false
    this._isFormValid = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Blog Post')}</h2>
      <grampsjs-blog-post-form
        .appState="${this.appState}"
        @blog-post-form:changed="${this._handleFormChanged}"
      ></grampsjs-blog-post-form>
      ${this._isSaving
        ? html`<p>${this._('Saving...')}</p>`
        : this.renderButtons()}
    `
  }

  renderButtons() {
    return html`
      <div class="spacer"></div>
      <p class="right">
        <md-outlined-button @click="${this._reset}">
          <grampsjs-icon
            slot="icon"
            path="${mdiClose}"
            color="currentColor"
          ></grampsjs-icon>
          ${this._('Reset')}
        </md-outlined-button>
        <md-filled-button
          @click="${this._submit}"
          ?disabled=${!this._isFormValid}
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiContentSave}"
            color="currentColor"
          ></grampsjs-icon>
          ${this._('Add')}
        </md-filled-button>
      </p>
    `
  }

  get _form() {
    return this.renderRoot.querySelector('grampsjs-blog-post-form')
  }

  _handleFormChanged(e) {
    const {data} = e.detail
    this._isFormValid = Boolean(data.title.trim()) && isIsoDate(data.date)
  }

  _reset() {
    this._form.reset()
    this._isSaving = false
  }

  async _fetchBlogTagHandle() {
    const data = await fetchAllTags(this.appState)
    if ('data' in data) {
      const tags = data.data.filter(tag => tag.name === 'Blog')
      if (tags.length > 0) {
        this._blogTagHandle = tags[0].handle
      }
    }
  }

  // create the Blog tag, returning an error message if it could not be
  // created or found afterwards
  async _createBlogTag() {
    const data = await this.appState.apiPost('/api/tags/', {name: 'Blog'})
    if ('error' in data) {
      return data.error
    }
    clearTagCache()
    await this._fetchBlogTagHandle()
    return this._blogTagHandle ? '' : this._('Failed to fetch the Blog tag')
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchBlogTagHandle()
  }

  // Saves the media objects whose privacy was changed in the form, and
  // resolves to whether all were saved
  async _saveMedia(formData) {
    for (const {url, data} of blogMediaRequests(formData)) {
      // eslint-disable-next-line no-await-in-loop
      const res = await this.appState.apiPut(url, data)
      if ('error' in res) {
        this.error = true
        this._errorMessage = res.error
        return false
      }
    }
    return true
  }

  async _submit() {
    if (this._isSaving) {
      return
    }
    this._isSaving = true
    // nothing entered while adding is lost when the form is reset
    const form = this._form
    form.inert = true
    try {
      if (!this._blogTagHandle) {
        await this._fetchBlogTagHandle()
      }
      if (!this._blogTagHandle) {
        const errorMessage = await this._createBlogTag()
        if (errorMessage) {
          this.error = true
          this._errorMessage = errorMessage
          return
        }
      }
      const formData = this._form.data
      if (!(await this._saveMedia(formData))) {
        return
      }
      const objects = newBlogPostObjects(formData, this._blogTagHandle)
      const data = await this.appState.apiPost('/api/objects/', objects)
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.find(obj => obj.new._class === 'Source').new
          .gramps_id
        // discards the draft of the text, while this is the current page
        this._form.reset()
        fireEvent(this, 'nav', {path: `blog/${grampsId}`})
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    } finally {
      this._isSaving = false
      form.inert = false
    }
  }
}

window.customElements.define(
  'grampsjs-view-new-blog-post',
  GrampsjsViewNewBlogPost
)
