import {html} from 'lit'

import '../components/GrampsjsTask.js'
import {GrampsjsViewSource} from './GrampsjsViewSource.js'
import {fireEvent} from '../util.js'

export class GrampsjsViewTask extends GrampsjsViewSource {
  constructor() {
    super()
    this._className = 'source'
  }

  renderElement() {
    return html`
      <grampsjs-task
        .saveNote="${data => this._saveNote(data)}"
        .source="${this._data}"
        .appState="${this.appState}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
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

  // no FAB
  // eslint-disable-next-line class-methods-use-this
  renderFab() {
    return ''
  }
}

window.customElements.define('grampsjs-view-task', GrampsjsViewTask)
