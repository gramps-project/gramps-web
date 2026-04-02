/*
View for managing tags: create, edit (name, color), delete
Only accessible to users with edit permission
*/

import {html, css} from 'lit'
import '@material/web/fab/fab'
import {mdiPlus} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsTagsManager.js'
import {makeHandle, fireEvent} from '../util.js'

export class GrampsjsViewTags extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        md-fab {
          position: fixed;
          bottom: 32px;
          right: 32px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _tags: {type: Array},
    }
  }

  constructor() {
    super()
    this._tags = []
  }

  renderContent() {
    return html`
      <h2>${this._('Organize Tags')}</h2>
      <grampsjs-tags-manager
        .data="${this._tags}"
        .appState="${this.appState}"
        @tag:save="${this._handleSave}"
        @tag:delete="${this._handleDelete}"
      ></grampsjs-tags-manager>
      <md-fab variant="secondary" @click="${this._openCreate}">
        <grampsjs-icon
          slot="icon"
          .path="${mdiPlus}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _openCreate() {
    this.renderRoot.querySelector('grampsjs-tags-manager').openCreate()
  }

  async _handleSave(e) {
    const {tag, isNew} = e.detail
    if (isNew) {
      await this.appState.apiPost('/api/tags/', {
        ...tag,
        handle: makeHandle(),
      })
    } else {
      await this.appState.apiPut(`/api/tags/${tag.handle}`, tag)
    }
    fireEvent(this, 'db:changed')
    this._fetchData()
  }

  async _handleDelete(e) {
    await this.appState.apiDelete(`/api/tags/${e.detail.handle}`)
    fireEvent(this, 'db:changed')
    this._fetchData()
  }

  handleUpdateStaleData() {
    this._fetchData()
  }

  firstUpdated() {
    super.firstUpdated()
    this._fetchData()
  }

  async _fetchData() {
    this.loading = true
    const data = await this.appState.apiGet(
      `/api/tags/?locale=${this.appState.i18n.lang || 'en'}&pagesize=500`
    )
    if ('data' in data) {
      this.error = false
      this._tags = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
    this.loading = false
  }
}

window.customElements.define('grampsjs-view-tags', GrampsjsViewTags)
