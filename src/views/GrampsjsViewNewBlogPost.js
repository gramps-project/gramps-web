import {html, css} from 'lit'
import {mdiClose} from '@mdi/js'

import '@material/mwc-textfield'
import '@material/web/iconbutton/icon-button.js'

import '../components/GrampsjsEditor.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormUpload.js'
import '../components/GrampsjsIcon.js'
import {GrampsjsViewNewSource} from './GrampsjsViewNewSource.js'

import {makeHandle, fireEvent} from '../util.js'

const dataDefault = {
  _class: 'Source',
}

export class GrampsjsViewNewBlogPost extends GrampsjsViewNewSource {
  static get styles() {
    return [
      super.styles,
      css`
        ul.file-list {
          list-style: none;
          margin: 0.5em 0 0;
          padding: 0;
        }

        ul.file-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _blogTagHandle: {type: String},
      _isUploading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {...dataDefault}
    this.postUrl = '/api/objects/'
    this.itemPath = 'blog'
    this.objClass = 'Source'
    this._blogTagHandle = ''
    this._isUploading = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Blog Post')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
        ></mwc-textfield>
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
      <p>
        <grampsjs-form-upload
          multiple
          id="upload"
          .appState="${this.appState}"
        ></grampsjs-form-upload>
      </p>
      ${this._renderSelectedFiles()} ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this._isUploading
        ? html`<p>${this._('Uploading media files')}...</p>`
        : this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  _renderSelectedFiles() {
    const upload = this.shadowRoot?.getElementById('upload')
    const files = upload?.files || []
    if (!files.length) {
      return ''
    }
    return html`
      <ul class="file-list">
        ${files.map(
          (file, index) => html`
            <li>
              <span>${file.name}</span>
              <md-icon-button @click="${() => this._removeFile(index)}">
                <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
              </md-icon-button>
            </li>
          `
        )}
      </ul>
    `
  }

  _removeFile(index) {
    const upload = this.shadowRoot.getElementById('upload')
    upload?.removeFile(index)
    this.requestUpdate()
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'upload') {
      this.requestUpdate()
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
    const text = this.shadowRoot.querySelector('grampsjs-editor')
    text.reset()
    this.isFormValid = false
    this.data = {...dataDefault}
    this._isUploading = false
  }

  _processedData(mediaRefs) {
    const handleSource = makeHandle()
    const handleNote = makeHandle()
    const {note, ...source} = this.data
    const hasNote = note?.text?.string
    const tagList = [
      ...new Set(
        [this._blogTagHandle, ...(this.data.tag_list || [])].filter(Boolean)
      ),
    ]
    if (!hasNote) {
      return [
        {
          ...source,
          tag_list: tagList,
          media_list: mediaRefs,
        },
      ]
    }
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

  async _uploadMedia() {
    const upload = this.shadowRoot.getElementById('upload')
    const files = upload?.files || []
    const mediaRefs = []
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      // eslint-disable-next-line no-await-in-loop
      const uploadData = await this.appState.apiPost('/api/media/', file, {
        isJson: false,
        dbChanged: false,
      })
      if ('error' in uploadData) {
        return {error: uploadData.error}
      }
      const mediaData = {
        ...uploadData.data[0].new,
        desc: file.name.replace(/\.[^/.]+$/, ''),
      }
      // eslint-disable-next-line no-await-in-loop
      const updateData = await this.appState.apiPut(
        `/api/media/${mediaData.handle}`,
        mediaData,
        {dbChanged: false}
      )
      if ('error' in updateData) {
        return {error: updateData.error}
      }
      mediaRefs.push({ref: mediaData.handle})
    }
    return {data: mediaRefs}
  }

  async _submit() {
    if (!this._blogTagHandle) {
      await this._fetchBlogTagHandle()
    }
    if (!this._blogTagHandle) {
      this.error = true
      this._errorMessage = this._('Failed to fetch the Blog tag')
      return
    }
    this._isUploading = true
    const uploadResult = await this._uploadMedia()
    this._isUploading = false
    if ('error' in uploadResult) {
      this.error = true
      this._errorMessage = uploadResult.error
      return
    }
    const processedData = this._processedData(uploadResult.data)
    this.appState.apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(
          obj => obj.new._class === this.objClass
        )[0].new.gramps_id
        fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }
}

window.customElements.define(
  'grampsjs-view-new-blog-post',
  GrampsjsViewNewBlogPost
)
