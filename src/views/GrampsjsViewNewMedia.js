import {html, css} from 'lit'
import {repeat} from 'lit/directives/repeat.js'

import '@material/web/progress/linear-progress.js'
import '@material/web/iconbutton/icon-button.js'
import {mdiClose, mdiFileDocumentOutline} from '@mdi/js'

import '../components/GrampsjsFormUpload.js'
import '../components/GrampsjsIcon.js'

import {GrampsjsNewMediaMixin} from '../mixins/GrampsjsNewMediaMixin.js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'

import {emptyDate, fireEvent} from '../util.js'

export class GrampsjsViewNewMedia extends GrampsjsNewMediaMixin(
  GrampsjsViewNewObject
) {
  static get styles() {
    return [
      ...(super.styles || []),
      css`
        .file-entry {
          border: 1px solid var(--grampsjs-body-font-color-20);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          position: relative;
        }

        .file-entry-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .file-preview {
          flex-shrink: 0;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--mdc-theme-surface, #fff);
          border: 1px solid var(--grampsjs-body-font-color-25);
          border-radius: 4px;
          overflow: hidden;
        }

        .file-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .file-preview grampsjs-icon {
          --grampsjs-icon-size: 60px;
        }

        .file-metadata {
          flex: 1;
          min-width: 0;
        }

        .file-entry-actions {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        .file-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .file-fields h4 {
          margin: 0 0 8px 0;
          font-size: 0.9em;
          color: var(--mdc-theme-on-surface, rgba(0, 0, 0, 0.6));
        }
      `,
    ]
  }

  static get properties() {
    return {
      filesData: {type: Array},
      uploadProgress: {type: Number},
      uploadTotal: {type: Number},
      isUploading: {type: Boolean},
      _isRemovingFile: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {_class: 'Media'}
    this.postUrl = '/api/media/'
    this.itemPath = 'media'
    this.objClass = 'Media'
    this.filesData = []
    this.uploadProgress = 0
    this.uploadTotal = 0
    this.isUploading = false
    this._isRemovingFile = false
  }

  renderContent() {
    return html`
      <h2>${this._('New Media')}</h2>

      ${this.isUploading
        ? html`
            <div style="margin: 20px 0;">
              <md-linear-progress
                value="${this.uploadTotal > 0
                  ? this.uploadProgress / this.uploadTotal
                  : 0}"
              ></md-linear-progress>
              <p style="text-align: center; margin-top: 8px;">
                ${this._(
                  'Uploading file %s of %s',
                  Math.min(this.uploadProgress + 1, this.uploadTotal),
                  this.uploadTotal
                )}...
              </p>
            </div>
          `
        : html` ${this._renderFormWithUpload()} ${this.renderButtons()} `}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  _renderFormWithUpload() {
    const upload = this.shadowRoot?.getElementById('upload')
    const files = upload?.files || []

    return html`
      <p>
        <grampsjs-form-upload
          id="upload"
          multiple
          .appState="${this.appState}"
        ></grampsjs-form-upload>
      </p>

      ${files.length > 0
        ? html`
            <div class="spacer"></div>
            ${repeat(
              files,
              file => file,
              (file, index) => this._renderFileEntry(file, index)
            )}
          `
        : ''}
    `
  }

  _renderFileEntry(file, index) {
    const filesData = this.filesData || []
    const data = filesData[index] || {}
    const isImage = file.type.startsWith('image')

    return html`
      <div class="file-entry">
        <div class="file-entry-actions">
          <md-icon-button
            @click="${() => this._removeFile(index)}"
            style="--md-icon-button-icon-color: var(--grampsjs-body-font-color-60);"
          >
            <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
          </md-icon-button>
        </div>

        <div class="file-entry-header">
          <div class="file-preview">
            ${isImage
              ? html`<img
                  src="${this._getFilePreviewUrl(file)}"
                  alt="${file.name}"
                />`
              : html`<grampsjs-icon
                  path="${mdiFileDocumentOutline}"
                ></grampsjs-icon>`}
          </div>

          <div class="file-metadata">
            <div>${file.name}</div>
            <div
              style="color: var(--mdc-theme-on-surface, rgba(0, 0, 0, 0.6)); font-size: 0.9em;"
            >
              ${GrampsjsViewNewMedia._formatFileSize(file.size)}
            </div>
          </div>
        </div>

        <div class="file-fields">
          <div>
            <h4>${this._('Title')}</h4>
            <grampsjs-form-string
              value="${data.desc || file.name.replace(/\.[^/.]+$/, '')}"
              fullwidth
              id="desc-${index}"
              data-index="${index}"
            ></grampsjs-form-string>
          </div>

          <div>
            <h4>${this._('Date')}</h4>
            <grampsjs-form-select-date
              id="date-${index}"
              data-index="${index}"
              .appState="${this.appState}"
            >
            </grampsjs-form-select-date>
          </div>

          <grampsjs-form-private
            id="private-${index}"
            data-index="${index}"
            ?checked="${data.private || false}"
            .appState="${this.appState}"
          ></grampsjs-form-private>
        </div>
      </div>
    `
  }

  _getFilePreviewUrl(file) {
    if (!file.type.startsWith('image')) {
      return ''
    }
    if (!this._filePreviewUrls) {
      this._filePreviewUrls = new Map()
    }
    if (!this._filePreviewUrls.has(file)) {
      const url = URL.createObjectURL(file)
      this._filePreviewUrls.set(file, url)
    }
    return this._filePreviewUrls.get(file)
  }

  static _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
  }

  _removeFile(index) {
    const upload = this.shadowRoot.getElementById('upload')
    if (upload) {
      // Revoke object URL to prevent memory leak
      const file = upload.files[index]
      if (this._filePreviewUrls && file) {
        const url = this._filePreviewUrls.get(file)
        if (url) {
          URL.revokeObjectURL(url)
          this._filePreviewUrls.delete(file)
        }
      }
      // Remove from filesData BEFORE calling upload.removeFile
      // and set flag to prevent upload handler from running
      if (this.filesData) {
        this.filesData = this.filesData.filter((_, i) => i !== index)
      }
      this._isRemovingFile = true
      upload.removeFile(index)
      this._isRemovingFile = false
      this.requestUpdate()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Clean up preview URLs
    if (this._filePreviewUrls) {
      this._filePreviewUrls.forEach(url => URL.revokeObjectURL(url))
      this._filePreviewUrls.clear()
    }
  }

  checkFormValidity() {
    const upload = this.shadowRoot.getElementById('upload')
    const files = upload?.files || []

    let valid = files.length > 0
    for (let i = 0; i < files.length; i += 1) {
      const dateSelect = this.shadowRoot.querySelector(`#date-${i}`)
      if (dateSelect && !dateSelect.isValid()) {
        valid = false
        break
      }
    }
    this.isFormValid = valid
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    const upload = this.shadowRoot.getElementById('upload')
    const files = upload?.files || []

    const index = originalTarget.dataset?.index
    if (index !== undefined) {
      const idx = parseInt(index, 10)
      if (!this.filesData[idx]) {
        this.filesData[idx] = {_class: 'Media'}
      }

      if (originalTarget.id.startsWith('desc-')) {
        this.filesData[idx] = {
          ...this.filesData[idx],
          desc: e.detail.data,
        }
      } else if (originalTarget.id.startsWith('date-')) {
        this.filesData[idx] = {
          ...this.filesData[idx],
          date: e.detail.data ?? emptyDate,
        }
      } else if (originalTarget.id.startsWith('private-')) {
        this.filesData[idx] = {
          ...this.filesData[idx],
          private: e.detail.checked,
        }
      }
    } else if (originalTarget.id === 'upload') {
      // Skip if we're in the middle of removing a file - _removeFile handles it
      if (this._isRemovingFile) {
        return
      }
      // Files changed - revoke old preview URLs to prevent memory leak
      if (this._filePreviewUrls) {
        this._filePreviewUrls.forEach(url => URL.revokeObjectURL(url))
        this._filePreviewUrls.clear()
      }
      // Initialize filesData array for new files
      this.filesData = files.map(file => ({
        _class: 'Media',
        desc: file.name.replace(/\.[^/.]+$/, ''),
      }))
    }
    this.checkFormValidity()
  }

  _reset() {
    super._reset()
    this.isFormValid = false
    this.data = {_class: 'Media'}
    this.filesData = []
    this.uploadProgress = 0
    this.uploadTotal = 0
    this.isUploading = false
    // Clean up preview URLs
    if (this._filePreviewUrls) {
      this._filePreviewUrls.forEach(url => URL.revokeObjectURL(url))
      this._filePreviewUrls.clear()
    }
  }

  async _submit() {
    const upload = this.shadowRoot.getElementById('upload')
    const files = upload?.files || []

    this.isUploading = true
    this.uploadTotal = files.length
    this.uploadProgress = 0

    try {
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        const metadata = this.filesData[i] || {
          _class: 'Media',
          desc: file.name.replace(/\.[^/.]+$/, ''),
        }

        // Step 1: Upload file
        // eslint-disable-next-line no-await-in-loop
        const uploadData = await this.appState.apiPost(this.postUrl, file, {
          isJson: false,
          dbChanged: false,
        })

        if ('error' in uploadData) {
          this.error = true
          this._errorMessage = `${this._('Failed to upload')} ${file.name}: ${
            uploadData.error
          }`
          this.isUploading = false
          return // Stop on first error
        }

        // Step 2: Update metadata
        const mediaData = {...uploadData.data[0].new, ...metadata}
        const updateUrl = `/api/media/${mediaData.handle}`
        // eslint-disable-next-line no-await-in-loop
        const updateData = await this.appState.apiPut(updateUrl, mediaData)

        if ('error' in updateData) {
          this.error = true
          this._errorMessage = `${this._('Failed to update')} ${file.name}: ${
            updateData.error
          }`
          this.isUploading = false
          return // Stop on first error
        }

        // Store the handle and gramps_id for navigation
        this.filesData[i] = {
          ...this.filesData[i],
          handle: mediaData.handle,
          gramps_id: mediaData.gramps_id,
        }

        this.uploadProgress = i + 1
      }

      // All uploads successful
      this.error = false
      this.isUploading = false

      // Navigate based on number of files
      if (files.length === 1) {
        // Single file: navigate to the media object
        const grampsId = this.filesData[0]?.gramps_id
        if (grampsId) {
          fireEvent(this, 'nav', {path: this._getItemPath(grampsId)})
        }
      } else {
        // Multiple files: navigate to home page
        fireEvent(this, 'nav', {path: ''})
      }
      this._reset()
    } catch (err) {
      this.error = true
      this._errorMessage = err.message || this._('Failed to upload')
      this.isUploading = false
    }
  }
}

window.customElements.define('grampsjs-view-new-media', GrampsjsViewNewMedia)
