import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsImport.js'
import '../components/GrampsjsImportMedia.js'
import '../components/GrampsjsMediaFileStatus.js'
import '../components/GrampsjsMediaStatus.js'
import '../components/GrampsjsTaskProgressIndicator.js'
import '../components/GrampsjsTreeQuotas.js'
import {apiPost} from '../api.js'
import '@material/mwc-button'

import {clickKeyHandler} from '../util.js'

export class GrampsjsViewAdminSettings extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
  }

  renderContent() {
    return html`
      <h3>${this._('Usage quotas')}</h3>

      <grampsjs-tree-quotas .strings="${this.strings}"></grampsjs-tree-quotas>

      <grampsjs-media-status .strings="${this.strings}"></grampsjs-media-status>
      ${this.dbInfo?.object_counts?.media
        ? html`<grampsjs-media-file-status
            .strings="${this.strings}"
          ></grampsjs-media-file-status>`
        : ''}

      <grampsjs-import .strings="${this.strings}"></grampsjs-import>

      <grampsjs-import-media .strings="${this.strings}"></grampsjs-import-media>

      <h3>${this._('Manage search index')}</h3>

      <p>
        ${this._(
          'Manually updating the search index is usually unnecessary, but it may become necessary after an upgrade.'
        )}
      </p>
      <mwc-button
        outlined
        @click="${this._updateSearch}"
        @keydown="${clickKeyHandler}"
        >${this._('Update search index')}</mwc-button
      >
      <grampsjs-task-progress-indicator
        class="button"
        id="progress-update-search"
        size="20"
      ></grampsjs-task-progress-indicator>
    `
  }

  async _updateSearch() {
    const prog = this.renderRoot.querySelector('#progress-update-search')
    prog.reset()
    prog.open = true
    const data = await apiPost('/api/search/index/?full=1')
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
    }
  }
}

window.customElements.define(
  'grampsjs-view-admin-settings',
  GrampsjsViewAdminSettings
)
