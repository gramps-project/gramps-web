import {css, html} from 'lit'
import {mdiPencil} from '@mdi/js'

import '@material/web/fab/fab.js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsBlogPost.js'
import '../components/GrampsjsBlogPostForm.js'
import '../components/GrampsjsIcon.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {clearDraftsWithPrefix} from '../api.js'
import {fetchAllTags} from '../tags.js'
import {fireEvent} from '../util.js'
import {
  blogMediaRequests,
  blogPostNote,
  blogPostRules,
  blogPostSaveRequests,
  isIsoDate,
} from '../blog.js'

// The page of a blog post. In edit mode, it shows the form of the post,
// which the save button of edit mode saves.
export class GrampsjsViewBlogPost extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      edit: {type: Boolean},
      _dataSources: {type: Array},
      _dataNotes: {type: Array},
    }
  }

  constructor() {
    super()
    this.grampsId = ''
    this.edit = false
    this._dataSources = []
    this._dataNotes = []
    this._firstLoaded = false
    this._saving = false
    // the post and its note as the server has them while editing
    this._editSource = null
    this._editNote = null
    this._boundToggleEditMode = this._toggleEditMode.bind(this)
    this._boundDisableEditMode = this._disableEditMode.bind(this)
    this._boundHandleSave = this._handleSave.bind(this)
    this._boundDeleteSelf = this._deleteSelf.bind(this)
  }

  get canEdit() {
    return Boolean(this.appState?.permissions?.canEdit)
  }

  get _source() {
    return this._dataSources[0] ?? null
  }

  renderContent() {
    if (this.edit && this._source) {
      return html`
        <grampsjs-blog-post-form
          .source="${this._source}"
          .appState="${this.appState}"
        ></grampsjs-blog-post-form>
      `
    }
    return html`
      ${this.renderPosts()}
      ${this.canEdit && this._source ? this.renderFab() : ''}
    `
  }

  renderFab() {
    return html`
      <md-fab variant="primary" @click=${this._activateEditMode}>
        <grampsjs-icon
          slot="icon"
          .path="${mdiPencil}"
          color="currentColor"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _activateEditMode() {
    this._editSource = this._source
    this._editNote = blogPostNote(this._source) ?? null
    this.edit = true
    fireEvent(this, 'edit-mode:on', {
      title: this._('Edit'),
      saveButton: true,
    })
  }

  _toggleEditMode() {
    if (!this.active || !this.canEdit || !this._source) {
      return
    }
    if (this.edit) {
      fireEvent(this, 'edit-mode:close-request')
    } else {
      this._activateEditMode()
    }
  }

  // Deletes the post, as the delete button of edit mode does on object pages.
  // Its note stays, like the notes of other deleted objects, and the deletion
  // can be undone.
  async _deleteSelf() {
    const source = this._source
    if (!this.active || !this.edit || !source) {
      return
    }
    const {handle, gramps_id: grampsId} = source
    const data = await this.appState.apiDelete(`/api/sources/${handle}`, {
      dbChanged: false,
    })
    if ('error' in data) {
      fireEvent(this, 'grampsjs:error', {message: data.error})
      return
    }
    clearDraftsWithPrefix(`blog:${grampsId}:`)
    this.edit = false
    this._dataSources = []
    fireEvent(this, 'nav', {path: 'blog'})
    fireEvent(this, 'db:changed')
    fireEvent(this, 'transaction:undo', {
      message: this._('Object %s deleted.', grampsId),
      transaction: data.data,
      redirect: `blog/${grampsId}`,
    })
  }

  // the post may have changed while it was edited
  _disableEditMode() {
    if (!this.edit) {
      return
    }
    this.edit = false
    if (this._isStale) {
      this._isStale = false
      this._fetchData()
    }
  }

  // while editing, the post reloads when edit mode ends, so the form stays
  handleUpdateStaleData() {
    if (this.edit) {
      this._isStale = true
    } else if (this.grampsId) {
      this._fetchData()
    }
  }

  get _form() {
    return this.renderRoot.querySelector('grampsjs-blog-post-form')
  }

  // Saves the form; edit mode ends if all requests succeeded. The form
  // can't be changed while saving, so nothing entered meanwhile is lost.
  async _handleSave() {
    if (!this.active || !this.edit || this._saving) {
      return
    }
    const form = this._form
    const {data} = form
    if (!data.title.trim() || !isIsoDate(data.date)) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('This field is mandatory'),
      })
      return
    }
    this._saving = true
    form.inert = true
    try {
      if (await this._save(data)) {
        clearDraftsWithPrefix(`blog:${this.grampsId}:`)
        fireEvent(this, 'edit-mode:off')
      }
    } finally {
      this._saving = false
      form.inert = false
    }
  }

  // Sends the requests saving the data in order, stopping at the first
  // error, and resolves to whether all succeeded. After an error, the post
  // and its note are loaded again, so saving again compares the form with
  // what the server has; the form keeps what was entered.
  async _save(data) {
    const tags = await fetchAllTags(this.appState)
    const blogTagHandle =
      (tags.data ?? []).find(tag => tag.name === 'Blog')?.handle ?? ''
    const requests = [
      ...blogMediaRequests(data),
      ...blogPostSaveRequests(
        this._editSource,
        this._editNote,
        data,
        blogTagHandle
      ),
    ]
    for (const {method, url, data: object} of requests) {
      // eslint-disable-next-line no-await-in-loop
      const res =
        method === 'POST'
          ? await this.appState.apiPost(url, object)
          : await this.appState.apiPut(url, object)
      if ('error' in res) {
        fireEvent(this, 'grampsjs:error', {message: res.error})
        await this._reloadEdited()
        return false
      }
    }
    return true
  }

  async _reloadEdited() {
    const res = await this.appState.apiGet(this._sourceUrl())
    const source = res.data?.[0]
    if (source) {
      this._editSource = source
      this._editNote = blogPostNote(source) ?? null
    }
  }

  // a source without the Blog tag is not a blog post
  _sourceUrl() {
    return `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(blogPostRules(this.grampsId))
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&backlinks=true&extend=all`
  }

  renderPosts() {
    if (this._firstLoaded && this._dataSources.length === 0) {
      return html`
        <p>${this._('Not found')}</p>
        <p><a href="/blog">${this._('Blog')}</a></p>
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
    const grampsId = blogPostNote(this._source)?.gramps_id
    if (!grampsId) {
      return ''
    }
    const options = {
      link_format: `/{obj_class}/{gramps_id}`,
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

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
    window.addEventListener('edit-mode:save', this._boundHandleSave)
    window.addEventListener('edit-mode:delete', this._boundDeleteSelf)
  }

  disconnectedCallback() {
    window.removeEventListener('edit-mode:toggle', this._boundToggleEditMode)
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
    window.removeEventListener('edit-mode:save', this._boundHandleSave)
    window.removeEventListener('edit-mode:delete', this._boundDeleteSelf)
    super.disconnectedCallback()
  }

  async _fetchData() {
    this.loading = true
    await this.appState.apiGet(this._sourceUrl()).then(data => {
      if ('data' in data) {
        this.error = false
        this._dataSources = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
    this._dataNotes = []
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
