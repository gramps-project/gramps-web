/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import {css, html} from 'lit'

import '@material/mwc-fab'
import '@material/mwc-icon'

import {GrampsjsView} from './GrampsjsView.js'

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
  note: 'Edit Note',
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// move up the element with index i in the array
function moveUp(array, i) {
  if (i <= 0) {
    return array
  }
  return [
    ...array.slice(0, i - 1),
    array[i],
    array[i - 1],
    ...array.slice(i + 1),
  ]
}

// move down the element with index i in the array
function moveDown(array, i) {
  if (i >= array.length - 1) {
    return array
  }
  return [...array.slice(0, i), array[i + 1], array[i], ...array.slice(i + 2)]
}

export class GrampsjsViewObject extends GrampsjsView {
  static get styles() {
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
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      edit: {type: Boolean},
      editDialogContent: {type: String},
      _data: {type: Object},
      _className: {type: String},
      _saveButton: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.edit = false
    this.editDialogContent = ''
    this._data = {}
    this._className = ''
    this._saveButton = false
    this._boundDisableEditMode = this._disableEditMode.bind(this)
    this._boundDeleteSelf = this._deleteSelf.bind(this)
    this._boundToggleEditMode = this._toggleEditMode.bind(this)
  }

  get canEdit() {
    return this.appState.permissions.canEdit
  }

  getUrl() {
    return ''
  }

  renderContent() {
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

  renderFab() {
    return html`
      <mwc-fab icon="edit" @click="${this._activateEditMode}"></mwc-fab>
    `
  }

  _activateEditMode() {
    this.edit = true
    fireEvent(this, 'edit-mode:on', {
      title: this._(editTitle[this._className] || 'Edit'),
      saveButton: this._saveButton,
    })
  }

  _disableEditMode() {
    this.edit = false
  }

  _toggleEditMode() {
    if (!this.active || !this.canEdit) {
      return
    }
    if (this.edit) {
      fireEvent(this, 'edit-mode:close-request')
    } else {
      this._activateEditMode()
    }
  }

  renderElement() {
    return html``
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:off', this._boundDisableEditMode)
    window.addEventListener('edit-mode:delete', this._boundDeleteSelf)
    window.addEventListener('edit-mode:toggle', this._boundToggleEditMode)
    this.addEventListener('edit:action', this.handleEditAction.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('edit:action', this.handleEditAction.bind(this))
    window.removeEventListener('edit-mode:off', this._boundDisableEditMode)
    window.removeEventListener('edit-mode:delete', this._boundDeleteSelf)
    window.removeEventListener('edit-mode:toggle', this._boundToggleEditMode)
    super.disconnectedCallback()
  }

  update(changed) {
    super.update(changed)
    if (this.active && changed.has('grampsId')) {
      this._updateData()
    }
    if (
      changed.has('active') &&
      this.active &&
      (Object.keys(this._data).length === 0 ||
        this._data.gramps_id !== this.grampsId) &&
      !this.loading
    ) {
      this._updateData()
    }
    if (
      changed.has('appState') &&
      changed.get('appState')?.i18n?.lang !== this.appState.i18n.lang
    ) {
      this._handleLangChange(this.appState.i18n.lang)
    }
  }

  _updateData(clearData = true) {
    if (this._url === '') {
      return
    }
    if (this.grampsId !== undefined && this.grampsId) {
      if (clearData) {
        this._clearData()
      }
      this.loading = true
      this.appState.apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          ;[this._data] = data.data
          this.error = false
          if (this._className !== '') {
            this.dispatchEvent(
              new CustomEvent('object:loaded', {
                bubbles: true,
                composed: true,
                detail: {grampsId: this.grampsId, className: this._className},
              })
            )
            this._handleObjectLoaded(this._data)
          }
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }

  _handleLangChange(lang) {
    if (this.active && lang === this.appState.i18n.lang) {
      this._updateData(false)
    }
  }

  _clearData() {
    this._data = {}
  }

  _handleObjectLoaded() {}

  async _deleteSelf() {
    const {handle} = this._data
    const grampsId = this._data.gramps_id
    const endpoint = objectTypeToEndpoint[this._className]
    if (this.active && endpoint && handle) {
      const url = `/api/${endpoint}/${handle}`
      const data = await this.appState.apiDelete(url, {dbChanged: false})
      if ('data' in data) {
        this.grampsId = ''
        this._data = {}
        fireEvent(this, 'db:changed')
        fireEvent(this, 'nav', {path: ''})
        fireEvent(this, 'transaction:undo', {
          message: this._('Object %s deleted.', grampsId),
          transaction: data.data,
          redirect: `${this._className}/${grampsId}`,
        })
      } else if ('error' in data) {
        fireEvent(this, 'grampsjs:error', {message: data.error})
      }
    }
  }

  handleEditAction(e) {
    if (e.detail.action === 'delEvent') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'addEventRef') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'updateEventRef') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'event_ref_list'
      )
    } else if (e.detail.action === 'addPlaceRef') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'updatePlaceRef') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'addChildRef') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'child_ref_list'
      )
    } else if (e.detail.action === 'addNoteRef') {
      this.addHandle(
        e.detail.data.data[0],
        this._data,
        this._className,
        'note_list'
      )
    } else if (e.detail.action === 'newCitation') {
      this._postObject(e.detail.data, 'citation').then(data => {
        if ('data' in data) {
          this.addHandle(
            e.detail.data.handle,
            this._data,
            this._className,
            'citation_list'
          )
        }
      })
    } else if (e.detail.action === 'newNote') {
      this._postObject(e.detail.data, 'note').then(data => {
        if ('data' in data) {
          this.addHandle(
            e.detail.data.handle,
            this._data,
            this._className,
            'note_list'
          )
        }
      })
    } else if (e.detail.action === 'newParent') {
      const {processedData, parent} = e.detail.data
      const {handle} = processedData.filter(obj => obj._class === 'Person')[0]
      this._postObject(processedData, 'object').then(data => {
        if ('data' in data) {
          const updatedFamily = {[`${parent}_handle`]: handle}
          this.updateProp(this._data, this._className, updatedFamily)
        }
      })
    } else if (e.detail.action === 'newChild') {
      const {processedData, frel, mrel} = e.detail.data
      const {handle} = processedData.filter(obj => obj._class === 'Person')[0]
      this._postObject(processedData, 'object').then(data => {
        if ('data' in data) {
          const childRefData = {
            ref: handle,
            frel,
            mrel,
          }
          this.addObject(
            childRefData,
            this._data,
            this._className,
            'child_ref_list'
          )
        }
      })
    } else if (e.detail.action === 'newEvent') {
      const {role, ...eventData} = e.detail.data
      this._postObject(eventData, 'event').then(data => {
        if ('data' in data) {
          const eventRefData = {
            _class: 'EventRef',
            ref: e.detail.data.handle,
            role,
          }
          this.addObject(
            eventRefData,
            this._data,
            this._className,
            'event_ref_list'
          )
        }
      })
    } else if (e.detail.action === 'addCitation') {
      this.addHandle(
        e.detail.data.data[0],
        this._data,
        this._className,
        'citation_list'
      )
    } else if (e.detail.action === 'addAttribute') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'addURL') {
      this.addObject(e.detail.data, this._data, this._className, 'urls')
    } else if (e.detail.action === 'addAssociation') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'delRepository') {
      this.delObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list'
      )
    } else if (e.detail.action === 'addRepoRef') {
      this.addObject(e.detail.data, this._data, this._className, 'reporef_list')
    } else if (e.detail.action === 'updateRepoRef') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'reporef_list'
      )
    } else if (e.detail.action === 'upRepository') {
      this.moveObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list',
        'up'
      )
    } else if (e.detail.action === 'downRepository') {
      this.moveObjectByIndex(
        e.detail.handle,
        this._data,
        this._className,
        'reporef_list',
        'down'
      )
    } else if (e.detail.action === 'addMediaRef') {
      this.addObject(e.detail.data, this._data, this._className, 'media_list')
    } else if (e.detail.action === 'updateMediaRef') {
      this.updateObject(
        e.detail.data,
        this._data,
        this._className,
        'media_list'
      )
    } else if (e.detail.action === 'updateAttribute') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'updateURL') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'urls'
      )
    } else if (e.detail.action === 'updateAssociation') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'delNoteRef') {
      this.delHandle(e.detail.handle, this._data, this._className, 'note_list')
    } else if (e.detail.action === 'delMediaRef') {
      this.delObject(e.detail.handle, this._data, this._className, 'media_list')
    } else if (e.detail.action === 'delPlace') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list'
      )
    } else if (e.detail.action === 'delAttr') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'attribute_list'
      )
    } else if (e.detail.action === 'delURL') {
      this.delObjectByIndex(e.detail.index, this._data, this._className, 'urls')
    } else if (e.detail.action === 'delAssociation') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'person_ref_list'
      )
    } else if (e.detail.action === 'upMediaRef') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'media_list',
        'up'
      )
    } else if (e.detail.action === 'downMediaRef') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'media_list',
        'down'
      )
    } else if (e.detail.action === 'upName') {
      this.moveName(e.detail.handle, this._data, 'up')
    } else if (e.detail.action === 'downName') {
      this.moveName(e.detail.handle, this._data, 'down')
    } else if (e.detail.action === 'delName') {
      this.delName(e.detail.data, this._data)
    } else if (e.detail.action === 'addName') {
      this.addObject(
        e.detail.data,
        this._data,
        this._className,
        'alternate_names'
      )
    } else if (e.detail.action === 'updateName') {
      this.updateName(e.detail.data, this._data)
    } else if (e.detail.action === 'addPlaceName') {
      this.addObject(e.detail.data, this._data, this._className, 'alt_names')
    } else if (e.detail.action === 'updatePlaceName') {
      this.updateObjectByIndex(
        e.detail.index,
        e.detail.data,
        this._data,
        this._className,
        'alt_names'
      )
    } else if (e.detail.action === 'delPlaceName') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'alt_names'
      )
    } else if (e.detail.action === 'delChildRef') {
      this.delObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list'
      )
    } else if (e.detail.action === 'delCitation') {
      this.delObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'citation_list'
      )
    } else if (e.detail.action === 'upEvent') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'event_ref_list',
        'up'
      )
    } else if (e.detail.action === 'downEvent') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'event_ref_list',
        'down'
      )
    } else if (e.detail.action === 'upPlace') {
      this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list',
        'up'
      )
    } else if (e.detail.action === 'downPlace') {
      this.moveObjectByIndex(
        e.detail.index,
        this._data,
        this._className,
        'placeref_list',
        'down'
      )
    } else if (e.detail.action === 'upChildRef') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list',
        'up'
      )
    } else if (e.detail.action === 'downChildRef') {
      this.moveObject(
        e.detail.handle,
        this._data,
        this._className,
        'child_ref_list',
        'down'
      )
    } else if (e.detail.action === 'upCitation') {
      this.moveHandle(
        e.detail.handle,
        this._data,
        this._className,
        'citation_list',
        'up'
      )
    } else if (e.detail.action === 'downCitation') {
      this.moveHandle(
        e.detail.handle,
        this._data,
        this._className,
        'citation_list',
        'down'
      )
    } else if (e.detail.action === 'updateProp') {
      this.updateProp(this._data, this._className, e.detail.data)
    } else {
      // eslint-disable-next-line no-alert
      alert(JSON.stringify(e.detail))
    }
  }

  delObject(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter(oRef => oRef.ref !== handle)
      return _obj
    })
  }

  delObjectByIndex(index, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter((_el, ind) => ind !== index)
      return _obj
    })
  }

  delHandle(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].filter(_handle => _handle !== handle)
      return _obj
    })
  }

  moveObject(handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      const i = (_obj[prop].map(oref => oref.ref) || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  moveObjectByIndex(index, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], index)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], index)
      }
      return _obj
    })
  }

  // for this method, 'handle' is the integer index
  // since names don't have handles!
  moveName(handle, obj, upDown) {
    return this._updateObject(obj, 'person', _obj => {
      if (
        (handle === 0 && upDown === 'down') ||
        (handle === 1 && upDown === 'up')
      ) {
        const primaryName = _obj.primary_name
        ;[_obj.primary_name] = _obj.alternate_names
        _obj.alternate_names = [primaryName, ..._obj.alternate_names.slice(1)]
      } else if (handle >= 1) {
        if (upDown === 'up') {
          _obj.alternate_names = moveUp(_obj.alternate_names, handle - 1)
        } else if (upDown === 'down') {
          _obj.alternate_names = moveDown(_obj.alternate_names, handle - 1)
        }
      }
      return _obj
    })
  }

  // for this method, 'handle' is the integer index
  // since names don't have handles!
  delName(data, obj) {
    const {index} = data
    return this._updateObject(obj, 'person', _obj => {
      if (index === 0) {
        // keep the entry but delete everything except the name type
        Object.keys(_obj.primary_name)
          .filter(key => key !== 'type')
          .forEach(key => delete _obj.primary_name[key])
      } else if (index === 1) {
        _obj.alternate_names = [..._obj.alternate_names.slice(1)]
      } else if (index > 1) {
        _obj.alternate_names = [
          ..._obj.alternate_names.slice(0, index - 1),
          ..._obj.alternate_names.slice(index),
        ]
      }
      return _obj
    })
  }

  updateName(data, obj) {
    return this._updateObject(obj, 'person', _obj => {
      if (data.index === 0) {
        _obj.primary_name = data.name
      } else if (data.index === 1) {
        _obj.alternate_names = [data.name, ..._obj.alternate_names.slice(1)]
      } else {
        _obj.alternate_names = [
          ..._obj.alternate_names.slice(0, data.index - 1),
          data.name,
          ..._obj.alternate_names.slice(data.index),
        ]
      }
      return _obj
    })
  }

  // add an object to a list of objects
  // e.g. an event reference to the event_ref_list
  addObject(data, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = [..._obj[prop], data]
      return _obj
    })
  }

  // update an object in a list of objects
  // e.g. an event references to the event_ref_list
  updateObject(data, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      // find first index
      const firstIdx = _obj[prop]
        .map((el, i) => ({ref: el.ref, index: i}))
        .filter(el => el.ref === data.ref)
      if (firstIdx.length === 0) {
        return _obj
      }
      _obj[prop] = _obj[prop].map((el, i) => {
        if (i === firstIdx[0].index) {
          return {...el, ...data}
        }
        return el
      })
      return _obj
    })
  }

  // update an object in a list of objects by list index
  updateObjectByIndex(index, data, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = _obj[prop].map((el, i) => {
        if (i === index) {
          return {...el, ...data}
        }
        return el
      })
      return _obj
    })
  }

  // add a handle to a list of handle
  // e.g. an note handle to the note_list
  addHandle(handle, obj, objType, prop) {
    return this._updateObject(obj, objType, _obj => {
      _obj[prop] = [..._obj[prop], handle]
      return _obj
    })
  }

  updateProp(obj, objType, objNew) {
    return this._updateObject(obj, objType, _obj => ({..._obj, ...objNew}))
  }

  moveHandle(handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, _obj => {
      const i = (_obj[prop] || []).indexOf(handle)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  async _postObject(obj, objType) {
    const url = `/api/${objectTypeToEndpoint[objType]}/`
    return this.appState.apiPost(url, obj)
  }

  _updateObject(obj, objType, updateFunc) {
    // remove extended, profile, backlinks, formatted keys from object
    // eslint-disable-next-line prefer-const
    let {extended, profile, backlinks, formatted, ...objNew} = obj
    objNew = {_class: capitalize(objType), ...objNew}
    const url = `/api/${objectTypeToEndpoint[objType]}/${obj.handle}`
    this.appState.apiPut(url, updateFunc(objNew)).then(() => {
      this._updateData(false)
      // Fire event to clear editor drafts after successful save
      fireEvent(this, 'edit:saved')
    })
  }
}
