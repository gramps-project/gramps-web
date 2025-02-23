import {html} from 'lit'

import {GrampsjsViewObject} from './GrampsjsViewObject.js'
import '../components/GrampsjsMediaObject.js'

import {objectTypeToEndpoint, arrayEqual} from '../util.js'

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
        @facetag:add="${this._handleFacePerson}"
        @rect:delete="${this._handleDeleteRect}"
        @file:replace="${this._handleUploadFile}"
      ></grampsjs-media-object>
    `
  }

  async _handleFacePerson(e) {
    const data = e.detail
    e.stopPropagation()
    if (!('personHandle' in data)) {
      return
    }
    if (data.oldHandle) {
      await this.addMediaRefToPerson(
        data.personHandle,
        data.mediaHandle,
        data.rect,
        false,
        false
      )
      await this.delMediaRef(
        data.oldHandle,
        data.oldType,
        data.mediaHandle,
        data.rect,
        false
      )
      this._updateData(false)
    } else {
      this.addMediaRefToPerson(data.personHandle, data.mediaHandle, data.rect)
    }
  }

  async _handleDeleteRect(e) {
    const data = e.detail
    e.stopPropagation()
    if (!('objHandle' in data)) {
      return
    }
    this.delMediaRef(data.objHandle, data.objType, data.mediaHandle, data.rect)
  }

  async addMediaRefToPerson(
    personHandle,
    mediaHandle,
    rect,
    reload = true,
    fireChanged = true
  ) {
    const url = `/api/people/${personHandle}`
    let resp = await this.appState.apiGet(url)
    if ('error' in resp) {
      return
    }
    const person = {_class: 'Person', ...resp.data}
    const data = {ref: mediaHandle, rect}
    person.media_list = [
      ...person.media_list.filter(mobj => mobj.ref !== mediaHandle),
      data,
    ]
    resp = await this.appState.apiPut(url, person, {dbChanged: fireChanged})
    if ('error' in resp) {
      return
    }
    if (reload) {
      this._updateData(false)
    }
  }

  async delMediaRef(objHandle, objType, mediaHandle, rect, reload = true) {
    const url = `/api/${objectTypeToEndpoint[objType]}/${objHandle}`
    let resp = await this.appState.apiGet(url)
    if ('error' in resp) {
      return
    }
    const obj = resp.data
    obj.media_list = obj.media_list.filter(
      mediaRef =>
        !arrayEqual(mediaRef.rect, rect) || mediaRef.ref !== mediaHandle
    )
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
