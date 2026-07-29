import {html, css, LitElement} from 'lit'

import '@material/web/button/filled-button.js'
import '@material/web/textfield/outlined-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {createFirstTree} from '../api.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsProgressIndicator.js'

const STATE_INITIAL = 0
const STATE_PROGRESS = 1
const STATE_ERROR = 2

class GrampsjsCreateTree extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .container {
          margin-left: auto;
          margin-right: auto;
          max-width: 30em;
          overflow-x: hidden;
          word-wrap: break-word;
          padding: 3em 1.5em;
        }

        md-outlined-text-field {
          width: 100%;
          margin-bottom: 0.7em;
        }

        h2 {
          color: var(--mdc-theme-primary);
          font-size: 32px;
          font-weight: 600;
        }

        p {
          line-height: 1.6;
        }

        .progress {
          position: relative;
          top: 0.2em;
          margin-left: 0.5em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      state: {type: Number},
      _error: {type: String},
    }
  }

  constructor() {
    super()
    this.state = STATE_INITIAL
    this._error = ''
  }

  render() {
    return html`
      <div class="container">
        <h2>${this._('Name your first tree')}</h2>
        <p>
          ${this._(
            'Choose a name for your family tree. You can change this later.'
          )}
        </p>
        <md-outlined-text-field
          id="tree-name"
          label="${this._('Tree name')}"
          value="${this._('My Family Tree')}"
        ></md-outlined-text-field>
        <p>
          <md-filled-button
            @click="${this._submit}"
            ?disabled=${this.state === STATE_PROGRESS}
          >
            ${this._('Submit')}
          </md-filled-button>
          <span class="progress">
            <grampsjs-progress-indicator
              ?open="${this.state !== STATE_INITIAL}"
              ?error="${this.state === STATE_ERROR}"
              errorMessage="${this.state === STATE_ERROR ? this._error : ''}"
              progress="-1"
            ></grampsjs-progress-indicator>
          </span>
        </p>
      </div>
    `
  }

  async _submit() {
    const field = this.shadowRoot.querySelector('#tree-name')
    const name = field?.value || this._('My Family Tree')
    this.state = STATE_PROGRESS
    const res = await createFirstTree(this.appState, name)
    if ('error' in res) {
      this.state = STATE_ERROR
      this._error = res.error || ''
      return
    }
    fireEvent(this, 'tree:created')
  }
}

window.customElements.define('grampsjs-create-tree', GrampsjsCreateTree)
