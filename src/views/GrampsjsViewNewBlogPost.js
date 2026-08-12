import {html} from 'lit'

import '@material/web/textfield/outlined-text-field'

import '../components/GrampsjsEditor.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {GrampsjsViewNewSource} from './GrampsjsViewNewSource.js'

import {makeHandle, fireEvent} from '../util.js'
import {clearDraftsWithPrefix} from '../api.js'

const dataDefault = {
  _class: 'Source',
}

export class GrampsjsViewNewBlogPost extends GrampsjsViewNewSource {
  static get properties() {
    return {
      _blogTagHandle: {type: String},
      _isSaving: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {...dataDefault}
    this.postUrl = '/api/objects/'
    this.itemPath = 'blog'
    this.objClass = 'Source'
    this._blogTagHandle = ''
    this._isSaving = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Blog Post')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <md-outlined-text-field
          required
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
        ></md-outlined-text-field>
      </p>

      <h4 class="label">${this._('Author')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="author"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Content')}</h4>
      <p>
        <grampsjs-editor
          @formdata:changed="${this.handleEditor}"
          id="blog-post-content-editor"
          .appState="${this.appState}"
        ></grampsjs-editor>
      </p>

      <h4 class="label">${this._('Media')}</h4>
      <grampsjs-form-select-object-list
        multiple
        objectType="media"
        .appState="${this.appState}"
        id="media"
      ></grampsjs-form-select-object-list>

      ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this._isSaving
        ? html`<p>${this._('Saving...')}</p>`
        : this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'media-list') {
      this.data = {
        ...this.data,
        media_list: (e.detail.data || []).map(ref => ({ref})),
      }
    }
  }

  handleEditor(e) {
    if (e.detail?.data?.string && e.detail.data.string.trim()) {
      this.data = {
        ...this.data,
        note: {_class: 'Note', text: e.detail.data},
      }
    } else {
      const {note, ...data} = this.data
      this.data = data
    }
  }

  checkFormValidity() {
    const name = this.shadowRoot.getElementById('source-name')
    name.reportValidity()
    try {
      this.isFormValid = name?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    super._reset()
    const name = this.shadowRoot.getElementById('source-name')
    if (name) {
      name.value = ''
    }
    const text = this.shadowRoot.querySelector('grampsjs-editor')
    text.reset()
    this.isFormValid = false
    this.data = {...dataDefault}
    this._isSaving = false
  }

  _processedData(mediaRefs) {
    const {note, ...source} = this.data
    const tagList = [
      ...new Set(
        [this._blogTagHandle, ...(this.data.tag_list || [])].filter(Boolean)
      ),
    ]
    if (!note?.text?.string) {
      return [
        {
          ...source,
          tag_list: tagList,
          media_list: mediaRefs,
        },
      ]
    }
    const handleSource = makeHandle()
    const handleNote = makeHandle()
    return [
      {
        ...source,
        handle: handleSource,
        note_list: [handleNote],
        tag_list: tagList,
        media_list: mediaRefs,
      },
      {
        ...note,
        handle: handleNote,
        tag_list: tagList,
      },
    ]
  }

  async _fetchBlogTagHandle(retry = true) {
    const lang = this.appState?.i18n?.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/tags/?locale=${lang}&pagesize=500`
    )
    if ('data' in data) {
      this._allTags = data.data
      const tags = data.data.filter(tag => tag.name === 'Blog')
      if (tags.length > 0) {
        this._blogTagHandle = tags[0].handle
      } else {
        const newTag = {name: 'Blog'}
        await this.appState.apiPost('/api/tags/', newTag)
        if (retry) {
          await this._fetchBlogTagHandle(false)
        }
      }
    }
  }

  firstUpdated() {
    this._fetchBlogTagHandle()
  }

  async _submit() {
    if (this._isSaving) {
      return
    }
    this._isSaving = true
    try {
      if (!this._blogTagHandle) {
        await this._fetchBlogTagHandle()
      }
      if (!this._blogTagHandle) {
        this.error = true
        this._errorMessage = this._('Failed to fetch the Blog tag')
        return
      }
      const processedData = this._processedData(this.data.media_list || [])
      const data = await this.appState.apiPost(this.postUrl, processedData)
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(
          obj => obj.new._class === this.objClass
        )[0].new.gramps_id
        const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
        clearDraftsWithPrefix(`${page}:${pageId}:`)
        fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    } finally {
      this._isSaving = false
    }
  }
}

window.customElements.define(
  'grampsjs-view-new-blog-post',
  GrampsjsViewNewBlogPost
)
