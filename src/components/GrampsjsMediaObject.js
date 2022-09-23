/* eslint-disable no-nested-ternary */
import {html, css} from 'lit'

import {mdiSelectDrag} from '@mdi/js'
import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsJsImage.js'
import './GrampsjsFormEditDate.js'
import './GrampsjsFormEditTitle.js'
import './GrampsjsFormEditMapLayer.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsFaces.js'
import {arrayEqual, fireEvent, getNameFromProfile} from '../util.js'
import {renderIconSvg} from '../icons.js'

import '@material/mwc-dialog'
import '@material/mwc-icon'
import '@material/mwc-icon-button'

export class GrampsjsMediaObject extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }

        grampsjs-img {
          margin: 30px 0;
        }

        dl::after {
          content: '';
          display: block;
          clear: both;
        }

        .controls {
          margin-top: 1em;
        }

        .hidden {
          visibility: hidden;
        }

        .controls span {
          display: inline-block;
          margin-left: 0.6em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      selectedRect: {type: Object},
      deletedRects: {type: Array},
      bbox: {type: Object},
      _drawing: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.selectedRect = {}
    this.deletedRects = []
    this.bbox = {}
    this._drawing = false
  }

  renderProfile() {
    return html`
      <h2>
        <mwc-icon>photo</mwc-icon>
        ${this.data.desc || this._('Media Object')}
        ${this.edit
          ? html`
              <mwc-icon-button
                icon="edit"
                class="edit"
                @click="${this._handleEditTitle}"
              ></mwc-icon-button>
            `
          : ''}
      </h2>

      <dl>
        ${this.data?.profile?.date || this.edit
          ? html`
              <div>
                <dt>${this._('Date')}</dt>
                <dd>${this.data.profile.date}</dd>
              </div>
              ${this.edit
                ? html`
                    <mwc-icon-button
                      icon="edit"
                      class="edit"
                      @click="${this._handleEditDate}"
                    ></mwc-icon-button>
                  `
                : ''}
            `
          : ''}
      </dl>

      ${!this.data?.mime?.startsWith('image')
        ? this._renderNoImage()
        : this.edit
        ? this._renderImageEdit()
        : this._renderImageNoEdit()}

      <grampsjs-view-media-lightbox
        id="obj-lightbox-view"
        @rect:clicked="${this._handleRectClick}"
        handle="${this.data.handle}"
        hideLeftArrow
        hideRightArrow
        active
        .strings="${this.strings}"
      >
      </grampsjs-view-media-lightbox>
    `
  }

  _renderImageEdit() {
    const noSelection = !this.selectedRect?.rect?.length
    return html`
      <p class="controls">
        <span style="position: relative; top: 5px;">
          <grampsjs-form-select-object
            fixedMenuPosition
            objectType="person"
            .strings="${this.strings}"
            id="face-select"
            label="${this._('Person')}"
            ?disabled="${noSelection}"
            class="edit"
            @select-object:changed="${this._handleFacePerson}"
          ></grampsjs-form-select-object>
        </span>
        <span>
          <mwc-icon-button
            class="edit"
            icon="delete"
            ?disabled="${noSelection}"
            @click="${this._handleFaceDelete}"
          ></mwc-icon-button>
        </span>
        <span>
          <mwc-icon-button
            class="edit"
            icon="deselect"
            ?disabled="${noSelection && !this._drawing}"
            @click="${this._handleFaceDeselect}"
          ></mwc-icon-button>
          <mwc-icon-button
            class="edit"
            ?disabled="${this._drawing}"
            @click="${this._handleEnableDraw}"
            >${renderIconSvg(mdiSelectDrag, '')}</mwc-icon-button
          >
        </span>
      </p>

      <grampsjs-rect-container
        .strings="${this.strings}"
        ?draw="${this._drawing}"
        @rect:draw="${this._handleDrawRec}"
      >
        <grampsjs-faces
          handle="${this.data.handle}"
          ?rectHidden="${this._drawing}"
          .selectedRect="${this.selectedRect?.rect || []}"
          .deletedRects="${[
            ...this.deletedRects,
            ...this._getRectangles().map(obj => obj.rect),
          ]}"
          .strings="${this.strings}"
          @rect:selected="${this._handleRectSelected}"
          slot="image"
        >
          <grampsjs-img
            handle="${this.data.handle}"
            size="1000"
            border
            mime="${this.data.mime}"
          ></grampsjs-img>
          ${this.selectedRect?.rect?.length
            ? html`<grampsjs-rect
                selected
                .rect="${this.selectedRect.rect}"
                label="?"
                target=""
              >
              </grampsjs-rect>`
            : ''}
        </grampsjs-faces>

        ${this._drawing
          ? ''
          : this._getRectangles().map(
              obj => html`
            <grampsjs-rect
              .rect="${obj.rect}"
              label="${obj.label}"
              target="${obj.type}/${obj.grampsId}"
              ?selected="${arrayEqual(obj.rect, this.selectedRect?.rect || [])}"
              ?resizable="${
                false // arrayEqual(obj.rect, this.selectedRect?.rect || [])
              }"
              @rect:clicked="${e => this._handeRectClickedEdit(e, obj)}"
            >
            </grampsjs-rect>
          </grampsjs-rect-container>

            `
            )}
      </grampsjs-rect-container>
    `
  }

  _renderNoImage() {
    return html`
      <grampsjs-img
        handle="${this.data.handle}"
        size="1000"
        class="link"
        border
        mime="${this.data.mime}"
        @click=${this._handleClick}
      ></grampsjs-img>
    `
  }

  _renderImageNoEdit() {
    return html`
      <grampsjs-rect-container
        .strings="${this.strings}"
        @rect:clicked="${this._handleRectClick}"
      >
        <grampsjs-img
          handle="${this.data.handle}"
          size="1000"
          class="link"
          border
          mime="${this.data.mime}"
          @click=${this._handleClick}
        ></grampsjs-img>

        ${this._getRectangles().map(
          obj => html`
            <grampsjs-rect
              .rect="${obj.rect}"
              label="${obj.label}"
              target="${obj.type}/${obj.grampsId}"
            >
            </grampsjs-rect>
          `
        )}
      </grampsjs-rect-container>
    `
  }

  _handleFaceDeselect(e) {
    this.selectedRect = {}
    this._drawing = false
    e.stopPropagation()
  }

  _handleEnableDraw(e) {
    this.selectedRect = {}
    this._drawing = true
    e.stopPropagation()
  }

  _handleDrawRec(e) {
    this.selectedRect = {rect: e.detail.rect}
  }

  _handleFaceDelete(e) {
    if (!('handle' in this.selectedRect)) {
      // just remove the detected face
      this.deletedRects = [...this.deletedRects, this.selectedRect.rect]
    } else {
      // delete the media reference from the object
      fireEvent(this, 'rect:delete', {
        objHandle: this.selectedRect.handle,
        objType: this.selectedRect.type,
        mediaHandle: this.data.handle,
        rect: this.selectedRect.rect,
      })
    }
    this.selectedRect = {}
    e.stopPropagation()
  }

  _handleRectSelected(e) {
    this.selectedRect = {rect: e.detail}
    e.stopPropagation()
  }

  _handeRectClickedEdit(e, obj) {
    this.selectedRect = obj
    e.stopPropagation()
  }

  async _handleFacePerson(e) {
    this._drawing = false
    const [obj] = e.detail.objects
    e.stopPropagation()
    const data = {
      personHandle: obj.handle,
      mediaHandle: this.data.handle,
      rect: this.selectedRect.rect,
      oldHandle: this.selectedRect.handle,
      oldType: this.selectedRect.type,
    }
    fireEvent(this, 'facetag:add', data)
    this.selectedRect = {}
  }

  _handleEditTitle() {
    this.dialogContent = html`
      <grampsjs-form-edit-title
        @object:save="${this._handleSaveTitle}"
        @object:cancel="${this._handleCancelDialog}"
        .strings=${this.strings}
        .data=${{desc: this.data?.desc || ''}}
        prop="desc"
      >
      </grampsjs-form-edit-title>
    `
  }

  _handleEditDate() {
    this.dialogContent = html`
    <grampsjs-form-edit-date
      @object:save="${this._handleSaveDate}"
      @object:cancel="${this._handleCancelDialog}"
      .strings=${this.strings}
      .data=${{date: this.data.date}}
    >
    </grampsjs-form-edit-title>
    `
  }

  _handleSaveTitle(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSaveDate(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleEditGeo() {
    this.dialogContent = html`
      <grampsjs-form-edit-map-layer
        @object:save="${this._handleSaveMap}"
        @object:cancel="${this._handleCancelDialog}"
        .strings="${this.strings}"
        .data="${this.data}"
      ></grampsjs-form-edit-map-layer>
    `
  }

  _getRectangles() {
    const backlinks = this.data?.extended?.backlinks || {}
    const references = this.data?.profile?.references || {}
    if (Object.keys(backlinks).length === 0) {
      return []
    }
    return Object.keys(backlinks)
      .map(key =>
        backlinks[key].map((obj, index) => {
          const refs = key in references ? references[key] : []
          const label =
            refs.length >= index
              ? getNameFromProfile(refs[index] || {}, key, this.strings)
              : '...'
          return {
            rect: obj.media_list.find(mobj => mobj.ref === this.data.handle)
              ?.rect,
            type: key,
            label,
            grampsId: obj.gramps_id,
            handle: obj.handle,
          }
        })
      )
      .flat()
      .filter(obj => obj.rect.length > 0)
  }

  _handleSaveMap(e) {
    const attrs = e.detail?.data?.attribute_list || []
    if (attrs.length > 0) {
      fireEvent(this, 'edit:action', {
        action: 'updateProp',
        data: {attribute_list: attrs},
      })
    }
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleClick() {
    const lightBoxView = this.shadowRoot.getElementById('obj-lightbox-view')
    lightBoxView.open()
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

  updated(changed) {
    if (changed.has('edit')) {
      this.selectedRect = {}
      this.deletedRects = []
      this._drawing = false
    }
  }
}

window.customElements.define('grampsjs-media-object', GrampsjsMediaObject)
