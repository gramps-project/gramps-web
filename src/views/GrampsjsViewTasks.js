import {css, html} from 'lit'
import {mdiPlus} from '@mdi/js'

import '@material/web/fab/fab.js'
import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTasks.js'
import '../components/GrampsjsIcon.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'

import {fireEvent, toWritableObject} from '../util.js'
import {sortTasks} from '../taskConstants.js'

export class GrampsjsViewTasks extends GrampsjsStaleDataMixin(GrampsjsView) {
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
      _data: {type: Array},
      _filters: {type: Array},
    }
  }

  constructor() {
    super()
    this._data = []
    this._filters = []
    this._query = ''
    // URI of the latest request of the task list
    this._latestUri = ''
  }

  render() {
    return html`<h2>${this._('Tasks')}</h2>

      <grampsjs-tasks
        .appState="${this.appState}"
        .data="${this._data}"
        ?loading="${this.loading}"
        @tasks:update-attribute="${this._handleUpdateAttribute}"
        @filters:changed="${this._handleFiltersChanged}"
      ></grampsjs-tasks>

      ${this.appState.permissions.canAdd ? this.renderFab() : ''} `
  }

  renderFab() {
    return html`
      <md-fab variant="secondary" @click=${this._handleClickAdd}>
        <grampsjs-icon
          slot="icon"
          .path="${mdiPlus}"
          color="var(--mdc-theme-on-secondary)"
        ></grampsjs-icon>
      </md-fab>
    `
  }

  _handleClickAdd() {
    fireEvent(this, 'nav', {path: 'new_task'})
  }

  async _fetchData() {
    this.loading = true
    const rules = {
      rules: [
        {
          name: 'HasTag',
          values: ['ToDo'],
        },
        ...this._filters,
      ],
    }
    let uri = `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&sort=-gramps_id&extend=tag_list`
    if (this._query) {
      uri = `${uri}&gql=${encodeURIComponent(this._query)}`
    }
    this._latestUri = uri
    const data = await this.appState.apiGet(uri)
    // a later request has replaced this one
    if (uri !== this._latestUri) {
      return
    }
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._data = sortTasks(data.data)
    }
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  // Updates the tasks one after another and reports the first failure
  async _handleUpdateAttribute(event) {
    const {objects, key, value} = event.detail
    let error = ''
    for (const object of objects) {
      const rest = toWritableObject(object)
      rest.attribute_list = [
        ...rest.attribute_list.filter(att => att.type !== key),
        {_class: 'SrcAttribute', type: key, value},
      ]
      // eslint-disable-next-line no-await-in-loop
      const result = await this.appState.apiPut(
        `/api/sources/${object.handle}`,
        rest,
        {dbChanged: false}
      )
      if ('error' in result && !error) {
        error = result.error
      }
    }
    fireEvent(this, 'db:changed')
    if (error) {
      fireEvent(this, 'grampsjs:error', {message: error})
    }
  }

  _handleFiltersChanged(e) {
    this._filters = e.detail.filters
    this._query = e.detail.query
    e.preventDefault()
    e.stopPropagation()
    this._fetchData()
  }

  _onLangChanged() {
    this._fetchData()
  }

  handleUpdateStaleData() {
    this._fetchData()
  }
}

window.customElements.define('grampsjs-view-tasks', GrampsjsViewTasks)
