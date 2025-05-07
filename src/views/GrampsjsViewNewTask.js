import {html} from 'lit'

import '@material/mwc-textfield'
import '@material/mwc-select'

import '../components/GrampsjsEditor.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import {GrampsjsViewNewSource} from './GrampsjsViewNewSource.js'

import {makeHandle, fireEvent} from '../util.js'

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
    const priority = this.data.attribute_list.filter(
      att => att.type === 'Priority'
    )[0]?.value
    return html`
      <h2>${this._('New Task')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
        ></mwc-textfield>
      </p>

      <h4 class="label">${this._('Description')}</h4>
      <p>
        <grampsjs-editor
          @formdata:changed="${this.handleEditor}"
          id="note-editor"
          .appState="${this.appState}"
        ></grampsjs-editor>
      </p>

      <h4 class="label">${this._('Priority')}</h4>
      <p>
        <mwc-select @change="${this.handlePriority}">
          <mwc-list-item ?selected="${priority < 4}" value="1"
            >${this._('High')}</mwc-list-item
          >
          <mwc-list-item ?selected="${priority === '5'}" value="5"
            >${this._('Medium')}</mwc-list-item
          >
          <mwc-list-item ?selected="${priority > 5}" value="9"
            >${this._('Low')}</mwc-list-item
          >
        </mwc-select>
      </p>

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleName(e) {
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
    name.reportValidity()
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
    if (!hasNote) {
      return [
        {
          ...source,
          attribute_list: [...source.attribute_list, attrStatus],
          tag_list: [this._todoTagHandle],
        },
      ]
    }
    return [
      {
        ...source,
        handle: handleSource,
        note_list: [handleNote],
        attribute_list: [...source.attribute_list, attrStatus],
        tag_list: [this._todoTagHandle],
      },
      {
        ...note,
        handle: handleNote,
        tag_list: [this._todoTagHandle],
        type: 'To Do',
      },
    ]
  }

  async _fetchTodoTagHandle(retry = true) {
    const data = await this.appState.apiGet('/api/tags/')
    if ('data' in data) {
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

  firstUpdated() {
    this._fetchTodoTagHandle()
  }

  _submit() {
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
