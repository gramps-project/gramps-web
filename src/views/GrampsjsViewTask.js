import {html} from 'lit'
import {mdiFormatListChecks} from '@mdi/js'

import '../components/GrampsjsBreadcrumbs.js'
import '../components/GrampsjsTask.js'
import {GrampsjsViewSource} from './GrampsjsViewSource.js'
import {fireEvent} from '../util.js'

// The page of a task, edited in place. It has no edit mode, so the FAB and
// the edit mode shortcut do nothing; the page deletes the task itself.
export class GrampsjsViewTask extends GrampsjsViewSource {
  constructor() {
    super()
    this._className = 'source'
  }

  // the breadcrumbs lead to the task list, in place of the sources
  renderBreadcrumbs() {
    return html`
      <grampsjs-breadcrumbs
        .data="${this._data}"
        .appState="${this.appState}"
        objectsName="Tasks"
        .objectIcon="${mdiFormatListChecks}"
        hideBookmark
        hideLock
      ></grampsjs-breadcrumbs>
    `
  }

  renderElement() {
    return html`
      <grampsjs-task
        .saveNote="${data => this._saveNote(data)}"
        .source="${this._data}"
        .appState="${this.appState}"
        @task:delete="${this._deleteSelf}"
      ></grampsjs-task>
    `
  }

  // Updates the task's note, or adds it if `data` has no handle. Resolves to
  // whether the save succeeded, after the task is reloaded.
  async _saveNote(data) {
    const res = data.handle
      ? await this.appState.apiPut(`/api/notes/${data.handle}`, data)
      : await this.appState.apiPost('/api/notes/', data)
    if ('error' in res) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
      return false
    }
    if (data.handle) {
      await this._updateData(false)
      return true
    }
    const [obj] = res.data
    return this.addHandle(obj.handle, this._data, this._className, 'note_list')
  }

  // eslint-disable-next-line class-methods-use-this
  get _pathAfterDelete() {
    return 'tasks'
  }

  // eslint-disable-next-line class-methods-use-this
  _objectPath(grampsId) {
    return `task/${grampsId}`
  }

  // eslint-disable-next-line class-methods-use-this
  renderFab() {
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  _toggleEditMode() {}
}

window.customElements.define('grampsjs-view-task', GrampsjsViewTask)
