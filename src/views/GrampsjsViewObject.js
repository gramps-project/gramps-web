import {html, css} from 'lit'

import '@material/mwc-fab'
import '@material/mwc-icon'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, apiPut, apiPost} from '../api.js'
import {fireEvent, objectTypeToEndpoint} from '../util.js'

const editTitle = {
  person: 'Edit Person',
  family: 'Edit Family',
  event: 'Edit Event',
  place: 'Edit Place',
  citation: 'Edit Citation',
  source: 'Edit Source',
  repository: 'Edit Repository',
  media: 'Edit Media Object',
  note: 'Edit Note'
}

export class GrampsjsViewObject extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
      }

      mwc-fab {
        position: fixed;
        bottom: 32px;
        right: 32px;
      }
    `]
  }

  static get properties () {
    return {
      grampsId: {type: String},
      canEdit: {type: Boolean},
      edit: {type: Boolean},
      editDialogContent: {type: String},
      _data: {type: Object},
      _className: {type: String},
      _saveButton: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.canEdit = false
    this.edit = false
    this.editDialogContent = ''
    this._data = {}
    this._className = ''
    this._saveButton = false
    this._boundDisableEditMode = this._disableEditMode.bind(this)
  }

  getUrl () {
    return ''
  }

  renderContent () {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return html`
    ${this.renderElement()}
    ${this.canEdit && !this.edit ? this.renderFab() : ''}
    ${this.editDialogContent}
    `
  }

  renderFab () {
    return html`
    <mwc-fab icon="edit" @click="${this._handleFab}"></mwc-fab>
    `
  }

  _handleFab () {
    this.edit = true
    fireEvent(this, 'edit-mode:on', {
      title: this._(editTitle[this._className] || 'Edit'),
      saveButton: this._saveButton
    })
  }

  _disableEditMode () {
    this.edit = false
  }

  renderElement () {
    return html``
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
    this.addEventListener('edit:action', this.handleEditAction.bind(this))
  }

  disconnectedCallback () {
    this.removeEventListener('edit:action', this.handleEditAction.bind(this))
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
    super.disconnectedCallback()
  }

  update (changed) {
    super.update(changed)
    if (this.active && changed.has('grampsId')) {
      this._updateData()
    }
  }

  _updateData (clearData = true) {
    if (this._url === '') {
      return
    }
    if (this.grampsId !== undefined && this.grampsId) {
      if (clearData) {
        this._data = {}
      }
      this.loading = true
      apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          [this._data] = data.data
          this.error = false
          if (this._className !== '') {
            this.dispatchEvent(new CustomEvent('object:loaded', {bubbles: true, composed: true, detail: {grampsId: this.grampsId, className: this._className}}))
          }
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }


  handleEditAction (e) {
    if (e.detail.action === 'delEvent') {
      this.delEvent(e.detail.handle, this._data, this._className)
    } else if (e.detail.action === 'addEventRef') {
      this.addObject(e.detail.data, this._data, this._className, 'event_ref_list')
    } else if (e.detail.action === 'addChildRef') {
      this.addObject(e.detail.data, this._data, this._className, 'child_ref_list')
    } else if (e.detail.action === 'addNoteRef') {
      this.addHandle(e.detail.data.data[0], this._data, this._className, 'note_list')
    } else if (e.detail.action === 'addCitation') {
      this._postObject(e.detail.data, 'citation').then((data) => {
        if ('data' in data) {
          this.addHandle(e.detail.data.handle, this._data, this._className, 'citation_list')
        }
      })
    } else if (e.detail.action === 'addMediaRef') {
      this.addObject(e.detail.data, this._data, this._className, 'media_list')
    } else if (e.detail.action === 'delNoteRef') {
      this.delHandle(e.detail.handle, this._data, this._className, 'note_list')
    } else if (e.detail.action === 'delMediaRef') {
      this.delObject(e.detail.handle, this._data, this._className, 'media_list')
    } else if (e.detail.action === 'delChildRef') {
      this.delObject(e.detail.handle, this._data, this._className, 'child_ref_list')
    } else if (e.detail.action === 'delCitation') {
      this.delHandle(e.detail.handle, this._data, this._className, 'citation_list')
    } else if (e.detail.action === 'upEvent') {
      this.moveObject(e.detail.handle, this._data, this._className, 'event_ref_list', 'up')
    } else if (e.detail.action === 'downEvent') {
      this.moveObject(e.detail.handle, this._data, this._className, 'event_ref_list', 'down')
    } else if (e.detail.action === 'upChildRef') {
      this.moveObject(e.detail.handle, this._data, this._className, 'child_ref_list', 'up')
    } else if (e.detail.action === 'downChildRef') {
      this.moveObject(e.detail.handle, this._data, this._className, 'child_ref_list', 'down')
    } else if (e.detail.action === 'upCitation') {
      this.moveHandle(e.detail.handle, this._data, this._className, 'citation_list', 'up')
    } else if (e.detail.action === 'downCitation') {
      this.moveHandle(e.detail.handle, this._data, this._className, 'citation_list', 'down')
    } else if (e.detail.action === 'updateProp') {
      this.updateProp(this._data, this._className, e.detail.data)
    } else {
      alert(JSON.stringify(e.detail))
    }
  }

  delEvent (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj.event_ref_list = _obj.event_ref_list.filter(eventRef => eventRef.ref !== handle)
      return _obj
    })
  }

  delObject (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj[prop] = _obj[prop].filter(oRef => oRef.ref !== handle)
      return _obj
    })
  }

  delHandle (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj[prop] = _obj[prop].filter(_handle => _handle !== handle)
      return _obj
    })
  }

  moveObject (handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, (_obj) => {
      const i = (_obj[prop].map(oref => oref.ref) || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  // add an object to a list of objects
  // e.g. an event references to the event_ref_list
  addObject (data, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj[prop] = [..._obj[prop], data]
      return _obj
    })
  }

  // add a handle to a list of handle
  // e.g. an note handle to the note_list
  addHandle (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj[prop] = [..._obj[prop], handle]
      return _obj
    })
  }

  updateProp (obj, objType, objNew) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj = {..._obj, ...objNew}
      return _obj
    })
  }

  moveHandle (handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, (_obj) => {
      const i = (_obj[prop] || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  async _postObject (obj, objType) {
    const url = `/api/${objectTypeToEndpoint[objType]}/`
    return apiPost(url, obj)
  }

  _updateObject (obj, objType, updateFunc) {
    // remove extended, profile, backlinks, formatted keys from object
    let {extended, profile, backlinks, formatted, ...objNew} = obj
    objNew = {_class: capitalize(objType), ...objNew}
    const url = `/api/${objectTypeToEndpoint[objType]}/${obj.handle}`
    apiPut(url, updateFunc(objNew)).then(() => this._updateData(false))
  }
}

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// move up the element with index i in the array
function moveUp (array, i) {
  if (i <= 0) {
    return array
  }
  return [
    ...array.slice(0, i - 1),
    array[i],
    array[i - 1],
    ...array.slice(i + 1)
  ]
}

// move down the element with index i in the array
function moveDown (array, i) {
  if (i >= array.length - 1) {
    return array
  }
  return [
    ...array.slice(0, i),
    array[i + 1],
    array[i],
    ...array.slice(i + 2)
  ]
}
