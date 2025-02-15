import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsTasks.js'

import {fireEvent} from '../util.js'

export class GrampsjsViewTasks extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
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
      _data: {type: Array},
      _filters: {type: Array},
    }
  }

  constructor() {
    super()
    this._data = []
    this._filters = []
    this._boundFetchData = this._fetchData.bind(this)
  }

  render() {
    return html`<h2>${this._('Tasks')}</h2>

      <grampsjs-tasks
        .appState="${this.appState}"
        .data="${this._data}"
        @tasks:update-attribute="${this._handleUpdateAttribute}"
        @filters:changed="${this._handleFiltersChanged}"
        ?canEdit="${this.appState.permissions.canEdit}"
      ></grampsjs-tasks>

      ${this.appState.permissions.canAdd ? this.renderFab() : ''} `
  }

  renderFab() {
    return html` <mwc-fab icon="add" @click=${this._handleClickAdd}></mwc-fab> `
  }

  _handleClickAdd() {
    fireEvent(this, 'nav', {path: 'new_task'})
  }

  // eslint-disable-next-line class-methods-use-this
  _getAttribute(obj, key) {
    return obj.attribute_list.filter(att => att.type === key)[0]?.value
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
    const uri = `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&locale=${
      this.appState.i18n.lang || 'en'
    }&sort=-gramps_id&extend=tag_list`
    const data = await this.appState.apiGet(uri)
    this.loading = false
    if ('data' in data) {
      this.error = false
      // sort
      const labelOrder = {
        Open: 1,
        'In Progress': 2,
        Blocked: 3,
        other: 4,
        Done: 5,
      }
      this._data = data.data.sort(
        (a, b) =>
          labelOrder[this._getAttribute(a, 'Status') || 'other'] -
          labelOrder[this._getAttribute(b, 'Status') || 'other']
      )
    }
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _handleUpdateAttribute(event) {
    const {key} = event.detail
    const {value} = event.detail
    for (let i = 0; i < event.detail.objects.length; i += 1) {
      const object = event.detail.objects[i]
      const {extended, profile, ...rest} = object
      rest.attribute_list = [
        ...rest.attribute_list.filter(att => att.type !== key),
        {type: key, value},
      ]
      // eslint-disable-next-line no-await-in-loop
      await this.appState.apiPut(`/api/sources/${object.handle}`, rest, {
        dbChanged: false,
      })
    }
    fireEvent(this, 'db:changed')
  }

  _handleFiltersChanged(e) {
    this._filters = e.detail.filters
    e.preventDefault()
    e.stopPropagation()
    this._fetchData()
  }

  firstUpdated() {
    if (this.appState.i18n.lang) {
      // don't load before we have strings
      this._fetchData()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('db:changed', this._boundFetchData)
  }

  disconnectedCallback() {
    window.removeEventListener('db:changed', this._boundFetchData)
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-view-tasks', GrampsjsViewTasks)
