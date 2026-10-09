import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsMediaObject.js'

import {
  objectTypeToEndpoint,
  endpointToObjectClass,
  normalizeRect,
  addMediaRegion,
  replaceMediaRegion,
  removeMediaRegion,
  fireEvent,
} from '../util.js'

export class GrampsjsViewMedia extends GrampsjsViewObject {
  static get properties() {
    return {
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
    this._className = 'media'
  }

  getUrl() {
    return `/api/media/?gramps_id=${this.grampsId}&locale=${
      this.appState.i18n.lang || 'en'
    }&backlinks=true&extend=all&profile=all`
  }

  renderElement() {
    return html`
      <grampsjs-media-object
        .data=${this._data}
        .appState="${this.appState}"
        .dbInfo=${this.dbInfo}
        ?canEdit="${this.canEdit}"
        ?edit="${this.edit}"
        @region:link="${this._handleRegionLink}"
        @region:update="${this._handleRegionUpdate}"
        @rect:delete="${this._handleDeleteRect}"
        @file:replace="${this._handleUploadFile}"
      ></grampsjs-media-object>
    `
  }

  async _handleRegionLink(e) {
    const data = e.detail
    e.stopPropagation()
    if (!('objHandle' in data)) {
      return
    }
    if (data.oldHandle) {
      if (data.oldHandle === data.objHandle && data.oldType === data.objType) {
        return
      }
      const added = await this.addMediaRef(
        data.objHandle,
        data.objType,
        data.mediaHandle,
        data.rect,
        false,
        false
      )
      if (!added) {
        return
      }
      await this.delMediaRef(
        data.oldHandle,
        data.oldType,
        data.mediaHandle,
        data.oldRect,
        false
      )
      this._updateData(false)
    } else {
      this.addMediaRef(
        data.objHandle,
        data.objType,
        data.mediaHandle,
        data.rect
      )
    }
  }

  // Saves one after the other, so that a save reads the media list as the
  // previous one left it
  async _handleRegionUpdate(e) {
    const data = e.detail
    e.stopPropagation()
    this._regionSave = (this._regionSave ?? Promise.resolve()).then(() =>
      this.updateMediaRef(
        data.objHandle,
        data.objType,
        data.mediaHandle,
        data.oldRect,
        data.rect
      )
    )
  }

  async _handleDeleteRect(e) {
    const data = e.detail
    e.stopPropagation()
    if (!('objHandle' in data)) {
      return
    }
    this.delMediaRef(data.objHandle, data.objType, data.mediaHandle, data.rect)
  }

  async addMediaRef(
    objHandle,
    objType,
    mediaHandle,
    rect,
    reload = true,
    fireChanged = true
  ) {
    const normalizedRect = normalizeRect(rect)
    if (!normalizedRect) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Invalid region coordinates'),
      })
      return false
    }
    const endpoint = objectTypeToEndpoint[objType]
    const url = `/api/${endpoint}/${objHandle}`
    let resp = await this.appState.apiGet(url)
    if ('error' in resp) {
      return false
    }
    const obj = {_class: endpointToObjectClass[endpoint], ...resp.data}
    obj.media_list = addMediaRegion(
      obj.media_list || [],
      mediaHandle,
      normalizedRect
    )
    resp = await this.appState.apiPut(url, obj, {dbChanged: fireChanged})
    if ('error' in resp) {
      return false
    }
    if (reload) {
      this._updateData(false)
    }
    return true
  }

  // Reloads even if saving fails, so that the media object shows the
  // regions as they are stored
  async updateMediaRef(objHandle, objType, mediaHandle, oldRect, rect) {
    const normalizedRect = normalizeRect(rect)
    if (!normalizedRect) {
      fireEvent(this, 'grampsjs:error', {
        message: this._('Invalid region coordinates'),
      })
      this._updateData(false)
      return
    }
    const url = `/api/${objectTypeToEndpoint[objType]}/${objHandle}`
    const resp = await this.appState.apiGet(url)
    if (!('error' in resp)) {
      const obj = resp.data
      obj.media_list = replaceMediaRegion(
        obj.media_list,
        mediaHandle,
        oldRect,
        normalizedRect
      )
      await this.appState.apiPut(url, obj)
    }
    this._updateData(false)
  }

  async delMediaRef(objHandle, objType, mediaHandle, rect, reload = true) {
    const url = `/api/${objectTypeToEndpoint[objType]}/${objHandle}`
    let resp = await this.appState.apiGet(url)
    if ('error' in resp) {
      return
    }
    const obj = resp.data
    obj.media_list = removeMediaRegion(obj.media_list, mediaHandle, rect)
    resp = await this.appState.apiPut(url, obj)
    if ('error' in resp) {
      return
    }
    if (reload) {
      this._updateData(false)
    }
  }

  _handleUploadFile(e) {
    const putUrl = `/api/media/${e.detail.handle}/file`
    this.appState.apiPut(putUrl, e.detail.data, {isJson: false}).then(data => {
      if ('data' in data) {
        this.error = false
        this._updateData()
        this._reloadImage()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  _reloadImage() {
    this.renderRoot
      .querySelectorAll(`grampsjs-media-object`)
      .forEach(obj => obj.reloadImage())
  }
}

window.customElements.define('grampsjs-view-media', GrampsjsViewMedia)
