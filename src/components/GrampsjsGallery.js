import {LitElement, css, html} from 'lit'
import '@material/mwc-button'
import '@material/mwc-icon'
import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'

import './GrampsJsImage.js'
import './GrampsjsLightbox.js'
import '../views/GrampsjsViewMediaLightbox.js'
import './GrampsjsFormMediaRef.js'
import './GrampsjsFormNewMedia.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsGallery extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .tile {
          margin: 3px;
          float: left;
          cursor: pointer;
          position: relative;
        }

        .clear {
          clear: both;
          padding-bottom: 2em;
        }

        .delbtn {
          position: absolute;
          right: 5px;
          bottom: 5px;
          opacity: 0.7;
        }
      `,
    ]
  }

  static get properties() {
    return {
      mediaRef: {type: Array},
      media: {type: Array},
      dialogContent: {type: String},
      edit: {type: Boolean},
      editRect: {type: Boolean},
      _lightboxSelected: {type: Number},
      radius: {type: Number},
      size: {type: Number},
      square: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.mediaRef = []
    this.media = []
    this.edit = false
    this.editRect = false
    this.dialogContent = ''
    this._lightboxSelected = 0
    this.radius = 0
    this.size = 200
    this.square = false
  }

  render() {
    return html`
      <div class="tiles">
        ${this.media.map((mediaObj, i, arr) =>
          this._renderThumbnail(i, arr.length)
        )}
      </div>

      <div class="clear"></div>

      <grampsjs-view-media-lightbox
        active
        ?editRect="${this.editRect}"
        id="gallery-lightbox-view"
        @lightbox:left="${this._handleLeft}"
        @lightbox:right="${this._handleRight}"
        @rect:clicked="${this._handleRectClick}"
        handle="${this.media[this._lightboxSelected]?.handle}"
        ?hideLeftArrow="${this._lightboxSelected === 0}"
        ?hideRightArrow="${this._lightboxSelected === this.media.length - 1}"
        .appState="${this.appState}"
      >
      </grampsjs-view-media-lightbox>

      ${this.edit
        ? html`
            <div>
              <mwc-icon-button
                class="edit"
                icon="add_link"
                @click="${this._handleShareClick}"
              ></mwc-icon-button>
              <mwc-icon-button
                class="edit"
                icon="add"
                @click="${this._handleAddClick}"
              ></mwc-icon-button>
              ${this.dialogContent}
            </div>
          `
        : ''}
    `
  }

  _handleRectClick(event) {
    this.dispatchEvent(
      new CustomEvent('nav', {
        bubbles: true,
        composed: true,
        detail: {path: event.detail.target},
      })
    )
  }

  _handleClick(i) {
    if (!this.edit) {
      const lightBoxView = this.shadowRoot.getElementById(
        'gallery-lightbox-view'
      )
      if (lightBoxView) {
        this._lightboxSelected = i
        lightBoxView.open()
      }
    }
  }

  _handleLeft(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected > 0) {
        this._lightboxSelected -= 1
      }
    }
  }

  _handleRight(event) {
    if (event.detail?.id === 'gallery-lightbox') {
      if (this._lightboxSelected < this.media.length - 1) {
        this._lightboxSelected += 1
      }
    }
  }

  _renderThumbnail(i, length) {
    const mediaObj = this.media[i]
    const {handle, mime} = mediaObj
    const {rect} = this.mediaRef[i]
    return html`<div class="tile">
      <grampsjs-img
        ?square="${this.square}"
        radius="${this.radius}"
        handle="${handle}"
        size="300"
        displayHeight="${this.size}"
        .rect="${rect || []}"
        mime="${mime}"
        @click="${() => this._handleClick(i)}"
      ></grampsjs-img>
      ${this.edit
        ? html`
            <div class="delbtn">
              ${i === 0
                ? ''
                : html`
                    <mwc-icon-button
                      class="edit"
                      icon="arrow_back"
                      @click="${() =>
                        this._handleMediaRefLeft(this.mediaRef[i].ref)}"
                    ></mwc-icon-button>
                  `}
              ${i === length - 1
                ? ''
                : html` <mwc-icon-button
                    class="edit"
                    icon="arrow_forward"
                    @click="${() =>
                      this._handleMediaRefRight(this.mediaRef[i].ref)}"
                  ></mwc-icon-button>`}
              <mwc-icon-button
                class="edit"
                icon="delete"
                @click="${() => this._handleMediaRefDel(this.mediaRef[i].ref)}"
              ></mwc-icon-button>
            </div>
          `
        : ''}
    </div>`
  }

  _handleMediaRefDel(handle) {
    fireEvent(this, 'edit:action', {action: 'delMediaRef', handle})
  }

  _handleMediaRefLeft(handle) {
    fireEvent(this, 'edit:action', {action: 'upMediaRef', handle})
  }

  _handleMediaRefRight(handle) {
    fireEvent(this, 'edit:action', {action: 'downMediaRef', handle})
  }

  _handleAddClick() {
    this.dialogContent = html`
      <grampsjs-form-new-media
        @object:save="${this._handleNewMediaSave}"
        @object:cancel="${this._handleMediaRefCancel}"
        .appState="${this.appState}"
        dialogTitle="${this._('Add a new media object')}"
      >
      </grampsjs-form-new-media>
    `
  }

  _handleShareClick() {
    this.dialogContent = html`
      <grampsjs-form-mediaref
        new
        @object:save="${this._handleMediaRefSave}"
        @object:cancel="${this._handleMediaRefCancel}"
        .appState="${this.appState}"
        objType="${this.objType}"
        dialogTitle=${this._('Select an existing media object')}
      >
      </grampsjs-form-mediaref>
    `
  }

  _handleNewMediaSave(e) {
    e.preventDefault()
    e.stopPropagation()
    const uploadForm = this.renderRoot.querySelector('grampsjs-form-new-media')
    // FIXME - we need some kind of progress indicator to show that sth is happening
    uploadForm.upload(e.detail.data).then(data => {
      if ('data' in data) {
        fireEvent(this, 'edit:action', {
          action: 'addMediaRef',
          data: {ref: data.data.handle},
        })
      }
    })
    this.dialogContent = ''
  }

  _handleMediaRefSave(e) {
    fireEvent(this, 'edit:action', {action: 'addMediaRef', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleMediaRefCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-gallery', GrampsjsGallery)
