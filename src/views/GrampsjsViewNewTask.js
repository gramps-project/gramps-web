import {html, nothing} from 'lit'

import '@material/web/textfield/filled-text-field.js'
import '@material/web/select/outlined-select.js'
import '@material/web/select/select-option.js'

import '../components/GrampsjsEditor.js'
import '../components/GrampsjsIcon.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import {GrampsjsViewNewSource} from './GrampsjsViewNewSource.js'

import {makeHandle, fireEvent, reportRequiredField} from '../util.js'
import {
  PRIORITY_ICONS,
  TASK_PRIORITIES,
  priorityLabel,
  taskAttribute,
} from '../taskConstants.js'

const dataDefault = {
  _class: 'Source',
  attribute_list: [{_class: 'SrcAttribute', type: 'Priority', value: '5'}],
}

export class GrampsjsViewNewTask extends GrampsjsViewNewSource {
  static get properties() {
    return {
      _todoTagHandle: {type: String},
    }
  }

  constructor() {
    super()
    this.data = dataDefault
    this.postUrl = '/api/objects/'
    this.itemPath = 'task'
    this.objClass = 'Source'
    this._todoTagHandle = ''
  }

  renderContent() {
    const priority = taskAttribute(this.data, 'Priority')
    return html`
      <h2>${this._('New Task')}</h2>

      <h3 class="label">${this._('Title')}</h3>
      <p>
        <md-filled-text-field
          required
          supporting-text="&nbsp;"
          style="width:100%;"
          @input="${this.handleName}"
          @blur="${this.handleName}"
          id="source-name"
        ></md-filled-text-field>
      </p>

      <p>
        <md-outlined-select
          label="${this._('Priority')}"
          @change="${this.handlePriority}"
        >
          ${this._renderPriorityIcon(priorityLabel(priority), 'leading-icon')}
          ${TASK_PRIORITIES.map(
            ({label, value}) => html`
              <md-select-option
                ?selected="${priorityLabel(priority) === label}"
                value="${value}"
              >
                ${this._renderPriorityIcon(label, 'start')}
                <span slot="headline">${this._(label)}</span>
              </md-select-option>
            `
          )}
        </md-outlined-select>
      </p>

      <h3 class="label">${this._('Description')}</h3>
      <p>
        <grampsjs-editor
          @formdata:changed="${this.handleEditor}"
          id="task-description-editor"
          .appState="${this.appState}"
        ></grampsjs-editor>
      </p>

      ${this._renderMediaForm('Attachments')} ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderPriorityIcon(label, slot) {
    const icon = PRIORITY_ICONS[label]
    if (!icon) {
      return ''
    }
    return html`<grampsjs-icon
      slot="${slot}"
      path="${icon.path}"
      color="${icon.color ?? nothing}"
      height="20"
      width="20"
    ></grampsjs-icon>`
  }

  handleName(e) {
    reportRequiredField(e.target, this._('This field is mandatory'))
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value.trim()}
  }

  _handleFormData(e) {
    this.checkFormValidity()
    super._handleFormData(e)
  }

  handleEditor(e) {
    if (e.detail?.data?.string && e.detail.data.string.trim()) {
      this.data = {
        ...this.data,
        note: {_class: 'Note', text: e.detail.data},
      }
    } else {
      const {note, ...data} = this.data
      this.data = data
    }
  }

  checkFormValidity() {
    const name = this.shadowRoot.getElementById('source-name')
    try {
      this.isFormValid = name?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  handlePriority(e) {
    const {value} = e.target
    this.data = {
      ...this.data,
      attribute_list: [
        ...this.data.attribute_list.filter(att => att.type !== 'Priority'),
        {_class: 'SrcAttribute', type: 'Priority', value},
      ],
    }
  }

  _reset() {
    super._reset()
    const text = this.shadowRoot.querySelector('grampsjs-editor')
    text.reset()
    this.isFormValid = false
    this.data = dataDefault
  }

  _processedData() {
    const handleSource = makeHandle()
    const handleNote = makeHandle()
    const {note, ...source} = this.data
    const hasNote = note?.text?.string
    const attrStatus = {_class: 'SrcAttribute', type: 'Status', value: 'Open'}
    const tagList = [
      ...new Set(
        [this._todoTagHandle, ...(this.data.tag_list || [])].filter(Boolean)
      ),
    ]
    if (!hasNote) {
      return [
        {
          ...source,
          attribute_list: [...source.attribute_list, attrStatus],
          tag_list: tagList,
        },
      ]
    }
    return [
      {
        ...source,
        handle: handleSource,
        note_list: [handleNote],
        attribute_list: [...source.attribute_list, attrStatus],
        tag_list: tagList,
      },
      {
        ...note,
        handle: handleNote,
        tag_list: tagList,
        type: 'To Do',
        private: Boolean(source.private),
      },
    ]
  }

  // Finds the ToDo tag, or creates it, on submit: opening the form does not
  // change the database
  async _fetchTodoTagHandle(retry = true) {
    const lang = this.appState?.i18n?.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/tags/?locale=${lang}&pagesize=500`
    )
    if ('data' in data) {
      this._allTags = data.data
      const tags = data.data.filter(tag => tag.name === 'ToDo')
      if (tags.length > 0) {
        this._todoTagHandle = tags[0].handle
      } else {
        const newTag = {name: 'ToDo'}
        await this.appState.apiPost('/api/tags/', newTag)
        if (retry) {
          await this._fetchTodoTagHandle(false)
        }
      }
    }
  }

  async _submit() {
    if (!this._todoTagHandle) {
      await this._fetchTodoTagHandle()
    }
    if (!this._todoTagHandle) {
      this.error = true
      this._errorMessage = this._('Failed to fetch the ToDo tag')
      return
    }
    const processedData = this._processedData()
    this.appState.apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        fireEvent(this, 'nav', {path: 'tasks'})
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }
}

window.customElements.define('grampsjs-view-new-task', GrampsjsViewNewTask)
