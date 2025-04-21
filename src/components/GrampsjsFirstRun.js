import {html, css, LitElement} from 'lit'

import '@material/mwc-icon'
import '@material/mwc-button'
import '@material/mwc-textfield'
import '@material/mwc-circular-progress'

import './GrampsjsPasswordManagerPolyfill.js'
import {mdiCheckCircle} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {
  __APIHOST__,
  apiGetTokens,
  updateTaskStatus,
  getTreeFromToken,
} from '../api.js'
import {fireEvent} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsFormUpload.js'
import {renderIcon} from '../icons.js'
import './GrampsjsProgressIndicator.js'

const STATE_ERROR = -1
const STATE_INITIAL = 0
const STATE_READY = 1
const STATE_PROGRESS = 2
const STATE_DONE = 3

const CONFIG_KEYS = {
  '#email_host': 'EMAIL_HOST',
  '#email_port': 'EMAIL_PORT',
  '#email_user': 'EMAIL_HOST_USER',
  '#email_pw': 'EMAIL_HOST_PASSWORD',
  '#email_from': 'DEFAULT_FROM_EMAIL',
  '#base_url': 'BASE_URL',
}

class GrampsjsFirstRun extends GrampsjsAppStateMixin(LitElement) {
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

        mwc-textfield {
          width: 100%;
          margin-bottom: 0.7em;
        }

        h1,
        h2,
        h3 {
          color: var(--mdc-theme-primary);
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
      token: {type: String},
      stateUser: {type: Number},
      stateConfig: {type: Number},
      stateTree: {type: Number},
      _errorUser: {type: String},
      _errorConfig: {type: String},
      _errorTree: {type: String},
      _uploadHint: {type: String},
      _tree: {type: String},
    }
  }

  constructor() {
    super()
    this.token = ''
    this.stateUser = STATE_INITIAL
    this.stateConfig = STATE_INITIAL
    this.stateTree = STATE_INITIAL
    this._errorUser = ''
    this._errorConfig = ''
    this._errorTree = ''
    this._uploadHint = ''
    this._tree = ''
  }

  render() {
    return html`
      <div class="container">
        <div class="form">
          <h1>${this._('Welcome to Gramps Web')}</h1>

          <h3>
            ${this._('Create an admin account')}
            ${this.stateUser !== STATE_INITIAL
              ? html`
                  <span class="icon">
                    ${renderIcon(mdiCheckCircle, '#41AD49')}
                  </span>
                `
              : ''}
          </h3>

          <p>${this._('Enter the details for the admin user.')}</p>

          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            autocapitalize="off"
            id="username"
            label="${this._('Username')}"
            type="text"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            autocapitalize="off"
            id="password"
            label="${this._('Password')}"
            type="password"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            autocapitalize="off"
            id="email"
            label="${this._('E-mail')}"
            type="email"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="full_name"
            label="${this._('Full Name')}"
            type="text"
          ></mwc-textfield>

          ${this._tree
            ? ''
            : html`
                <h3>
                  ${this._('E-mail settings')}
                  ${this.stateConfig !== STATE_INITIAL
                    ? html`
                        <span class="icon">
                          ${renderIcon(mdiCheckCircle, '#41AD49')}
                        </span>
                      `
                    : ''}
                </h3>

                <p>
                  ${this._(
                    'Optionally, enter existing IMAP credentials to enable e-mail notifications required e.g. for user registration.'
                  )}
                </p>

                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="email_host"
                  label="${this._('SMTP host')}"
                  type="text"
                ></mwc-textfield>
                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="email_port"
                  label="${this._('SMTP port')}"
                  type="text"
                  pattern="[0-9]+"
                ></mwc-textfield>
                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="email_user"
                  label="${this._('SMTP user')}"
                  type="text"
                ></mwc-textfield>
                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="email_pw"
                  label="${this._('SMTP password')}"
                  type="password"
                ></mwc-textfield>
                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="email_from"
                  label="${this._('From address')}"
                  type="email"
                ></mwc-textfield>
                <mwc-textfield
                  @input="${this.checkValidity}"
                  outlined
                  id="base_url"
                  label="${this._('Gramps Web base URL')}"
                  type="url"
                  placeholder="https://grampsweb.mydomain.com"
                ></mwc-textfield>
              `}

          <h3>
            ${this._('Upload family tree')}
            ${this.stateTree !== STATE_INITIAL
              ? html`
                  <span class="icon">
                    ${renderIcon(mdiCheckCircle, '#41AD49')}
                  </span>
                `
              : ''}
          </h3>

          <p>${this._('Optionally, upload existing family tree data.')}</p>

          <p>
            <grampsjs-form-upload
              .appState="${this.appState}"
              filename
              @formdata:changed="${this._handleUploadChanged}"
              ?disabled="${this.stateUser === STATE_DONE}"
            ></grampsjs-form-upload>
          </p>
          ${this._uploadHint ? html`${this._uploadHint}` : ''}

          <p style="margin-top: 2em;">
            ${this._('Need help? Check out ')}<a
              href="https://www.grampsweb.org/administration/import/"
              >${this._('the documentation')}</a
            >.
          </p>

          <h3>${this._('Submit')}</h3>

          <mwc-button
            raised
            label="${this._('Submit')}"
            type="submit"
            @click="${this._submit}"
            ?disabled=${this.stateUser !== STATE_READY &&
            this.stateUser !== STATE_ERROR}
          >
          </mwc-button>

          <p>
            ${this._showProgress(
              this._('Creating owner account'),
              this.stateUser,
              this._errorUser
            )}
            ${this._tree
              ? ''
              : this._showProgress(
                  this._('Storing configuration'),
                  this.stateConfig,
                  this._errorConfig
                )}
            ${this._showProgress(
              this._('Importing family tree'),
              this.stateTree,
              this._errorTree
            )}
          </p>

          <div
            style="visibility:${this.stateUser === STATE_DONE &&
            this.stateConfig !== STATE_PROGRESS &&
            this.stateTree !== STATE_PROGRESS
              ? 'visible'
              : 'hidden'};"
          >
            <mwc-button
              raised
              label="start"
              type="submit"
              id="start-btn"
              @click="${this._done}"
            >
            </mwc-button>
          </div>
        </div>
      </div>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _showProgress(text, status, message) {
    const progress = status === STATE_DONE ? 1 : -1
    return html`
      <br />
      ${text}
      <span class="progress">
        <grampsjs-progress-indicator
          ?open="${status !== STATE_INITIAL && status !== STATE_READY}"
          ?error="${status === STATE_ERROR}"
          errorMessage="${status === STATE_ERROR ? message : ''}"
          progress="${progress}"
        ></grampsjs-progress-indicator>
      </span>
    `
  }

  async _submit() {
    const username = this.shadowRoot.querySelector('#username')?.value || ''
    const password = this.shadowRoot.querySelector('#password')?.value || ''
    const email = this.shadowRoot.querySelector('#email')?.value || ''
    const fullName = this.shadowRoot.querySelector('#full_name')?.value || ''
    await this._submitUser(username, password, email, fullName)
    if (this.stateUser === STATE_ERROR) {
      return
    }
    const resp = await apiGetTokens(username, password)
    if ('error' in resp) {
      this.stateUser = STATE_ERROR
      this._errorUser = resp.error || ''
      return
    }

    if (this.stateConfig === STATE_READY) {
      await this._submitConfig()
      if (this.stateConfig !== STATE_ERROR) {
        this.stateConfig = STATE_DONE
      }
    }
    if (this.stateTree === STATE_READY) {
      const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
      const ext = uploadForm.file.name.split('.').pop().toLowerCase()
      await this._submitTree(ext, uploadForm.file)
    }
  }

  async _submitUser(username, password, email, fullName) {
    this.stateUser = STATE_PROGRESS
    try {
      const resp = await fetch(
        `${__APIHOST__}/api/users/${username}/create_owner/`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password,
            email,
            full_name: fullName,
          }),
        }
      )
      if (resp.status === 201) {
        this.stateUser = STATE_DONE
        const btn = this.shadowRoot.querySelector('#start-btn')
        if (btn) {
          btn.scrollIntoView({block: 'start', behavior: 'smooth'})
        }
        return
      }
      const data = await resp.json()
      this.stateUser = STATE_ERROR
      if (resp.status === 409) {
        const msg = data?.error?.message || ''
        if (msg.toLowerCase().includes('mail')) {
          this._errorUser = this._('This e-mail address is already in use')
        } else {
          this._errorUser = this._('This user name is already in use')
        }
      } else {
        this._errorUser = data?.error?.message || ''
      }
    } catch (error) {
      this.stateUser = STATE_ERROR
      this._errorUser = `${error}` || ''
    }
  }

  async _submitConfig() {
    this.stateConfig = STATE_PROGRESS
    for (const elId of Object.keys(CONFIG_KEYS)) {
      const key = CONFIG_KEYS[elId]
      const value = this.shadowRoot.querySelector(elId)
      if (value && value?.value) {
        // eslint-disable-next-line no-await-in-loop
        await this._submitConfigSingle(key, value.value)
      }
    }
  }

  async _submitConfigSingle(key, value) {
    const res = await this.appState.apiPut(`/api/config/${key}/`, {
      value,
    })
    if ('error' in res) {
      this.stateConfig = STATE_ERROR
      this._errorConfig = res.error || ''
    }
  }

  async _submitTree(ext, file) {
    this.stateTree = STATE_PROGRESS
    const res = await this.appState.apiPost(
      `/api/importers/${ext}/file`,
      file,
      {
        isJson: false,
      }
    )
    if ('error' in res) {
      this.stateTree = STATE_ERROR
      this._errorTree = res.error || ''
    } else if ('task' in res) {
      updateTaskStatus(res.task.id, status => {
        if (status.state === 'SUCCESS') {
          this.stateTree = STATE_DONE
        } else if (status.state === 'FAILURE' || status.state === 'REVOKED') {
          this.stateTree = STATE_ERROR
          this._errorTree = status.state
        }
      })
    } else {
      this.stateTree = STATE_DONE
    }
  }

  _done() {
    fireEvent(this, 'firstrun:done')
  }

  _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    if (!uploadForm.file?.name) {
      this._uploadHint = ''
      this.stateTree = STATE_INITIAL
      return
    }

    const ext = uploadForm.file.name.split('.').pop().toLowerCase()
    if (!['gpkg', 'gramps', 'gw', 'def', 'vcf', 'csv', 'ged'].includes(ext)) {
      this._uploadHint = html`<p class="alert error">
        ${this._('Unsupported format')}
      </p>`
      this.stateTree = STATE_INITIAL
      return
    }
    if (ext === 'gpkg') {
      this._uploadHint = html`<p class="alert error">
        ${this._(
          'The Gramps package format (.gpkg) is currently not supported.'
        )}
        ${this._(
          'Please upload a file in Gramps XML (.gramps) format without media files.'
        )}
      </p>`
      this.stateTree = STATE_INITIAL
      return
    }
    if (ext !== 'gramps') {
      this._uploadHint = html`<p class="alert warn">
        ${this._(
          'If you intend to synchronize an existing Gramps database with Gramps Web, use the Gramps XML (.gramps) format instead.'
        )}
      </p>`
    } else {
      this._uploadHint = ''
    }
    this.stateTree = STATE_READY
  }

  checkValidity() {
    if (this.stateUser === STATE_INITIAL && this._checkValidityUser()) {
      this.stateUser = STATE_READY
    } else if (this.stateUser === STATE_READY && !this._checkValidityUser()) {
      this.stateUser = STATE_INITIAL
    }
    if (this.stateConfig === STATE_INITIAL && this._checkValidityConfig()) {
      this.stateConfig = STATE_READY
    } else if (
      this.stateConfig === STATE_READY &&
      !this._checkValidityConfig()
    ) {
      this.stateConfig = STATE_INITIAL
    }
  }

  _checkValidityUser() {
    const username = this.shadowRoot.getElementById('username')
    const password = this.shadowRoot.getElementById('password')
    const fullName = this.shadowRoot.getElementById('full_name')
    const email = this.shadowRoot.getElementById('email')
    return (
      (username?.validity?.valid &&
        password?.validity?.valid &&
        fullName?.validity?.valid &&
        email?.validity?.valid) ||
      false
    )
  }

  _checkValidityConfig() {
    const host = this.shadowRoot.getElementById('email_host')
    const port = this.shadowRoot.getElementById('email_port')
    const user = this.shadowRoot.getElementById('email_user')
    const pw = this.shadowRoot.getElementById('email_pw')
    const from = this.shadowRoot.getElementById('email_from')
    const url = this.shadowRoot.getElementById('base_url')
    return (
      (host?.validity?.valid &&
        host?.value &&
        port?.validity?.valid &&
        port?.value &&
        user?.validity?.valid &&
        user?.value &&
        pw?.validity?.valid &&
        pw?.value &&
        from?.validity?.valid &&
        from?.value &&
        url?.validity?.valid &&
        url?.value) ||
      false
    )
  }

  updated(changed) {
    if (changed.has('token')) {
      this._tree = getTreeFromToken(this.token) || ''
    }
  }
}

window.customElements.define('grampsjs-first-run', GrampsjsFirstRun)
