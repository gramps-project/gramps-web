import {html} from 'lit'

import '../components/GrampsjsTask.js'
import {GrampsjsViewSource} from './GrampsjsViewSource.js'
import {apiPut, apiPost} from '../api.js'

export class GrampsjsViewTask extends GrampsjsViewSource {
  constructor() {
    super()
    this._className = 'source'
  }

  renderElement() {
    return html`
      <grampsjs-task
        @task:update-note-text="${this._handleUpdateNoteText}"
        @task:add-note-text="${this._handleAddNoteText}"
        .source="${this._data}"
        .strings="${this.strings}"
        ?edit="${this.edit}"
        ?canEdit="${this.canEdit}"
      ></grampsjs-task>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  async _handleUpdateNoteText(event) {
    const data = event.detail
    await apiPut(`/api/notes/${data.handle}`, data)
    this._updateData(false)
  }

  // eslint-disable-next-line class-methods-use-this
  async _handleAddNoteText(event) {
    const data = event.detail
    const res = await apiPost('/api/notes/', data)
    if ('data' in res) {
      const [obj] = res.data
      this.addHandle(obj.handle, this._data, this._className, 'note_list')
    }
    this._updateData(false)
  }

  // no FAB
  // eslint-disable-next-line class-methods-use-this
  renderFab() {
    return ''
  }
}

window.customElements.define('grampsjs-view-task', GrampsjsViewTask)
