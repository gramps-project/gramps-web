import { html, css, LitElement } from 'lit';

import '@material/mwc-icon';
import '@material/mwc-button';
import '@material/mwc-textfield';
import '@material/mwc-circular-progress';

import './GrampsjsPasswordManagerPolyfill';
import { sharedStyles } from '../SharedStyles.js';
import { __APIHOST__, apiGetTokens, apiPut, apiPost } from '../api.js';
import { fireEvent } from '../util.js';
import { GrampsjsTranslateMixin } from '../mixins/GrampsjsTranslateMixin.js';
import './GrampsjsFormUpload.js';
import { renderIcon } from '../icons.js';
import { mdiCheckCircle, mdiCloseCircle } from '@mdi/js';

const STATE_ERROR = -1;
const STATE_INITIAL = 0;
const STATE_READY = 1;
const STATE_PROGRESS = 2;
const STATE_DONE = 3;

const CONFIG_KEYS = {
  '#email_host': 'EMAIL_HOST',
  '#email_port': 'EMAIL_PORT',
  '#email_user': 'EMAIL_HOST_USER',
  '#email_pw': 'EMAIL_HOST_PASSWORD',
  '#email_from': 'DEFAULT_FROM_EMAIL',
  '#base_url': 'BASE_URL',
};

class GrampsjsFirstRun extends GrampsjsTranslateMixin(LitElement) {
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

        .icon {
          position: relative;
          top: 2px;
          opacity: 0.85;
          font-size: 1.2em;
          padding-left: 0.5em;
        }

        .success {
          color: #41ad49;
        }

        .error {
          color: #bf360c;
        }

        .warn {
          color: #f9a825;
        }

        .alert {
          background-color: rgba(109, 76, 65, 0.15);
          border-left: 4px solid rgba(109, 76, 65, 0.7);
          border-radius: 5px;
          padding: 0.8em 1em;
          font-size: 0.8em;
          color: rgba(0, 0, 0, 0.8);
          margin: 1.5em 0;
        }

        .alert.error {
          color: #bf360c;
          background-color: rgba(191, 54, 12, 0.2);
          border-left-color: rgba(191, 54, 12, 0.7);
        }

        .alert.warn {
          color: rgba(0, 0, 0, 0.5);
          background-color: rgba(251, 192, 45, 0.2);
          border-left-color: rgba(251, 192, 45, 0.7);
        }
      `,
    ];
  }

  static get properties() {
    return {
      token: { type: String },
      stateUser: { type: Number },
      stateConfig: { type: Number },
      stateTree: { type: Number },
      _uploadHint: { type: String },
    };
  }

  constructor() {
    super();
    this.token = '';
    this.stateUser = STATE_INITIAL;
    this.stateConfig = STATE_INITIAL;
    this.stateTree = STATE_INITIAL;
    this._uploadHint = '';
  }

  render() {
    return html`
      <div class="container">
        <div class="form">
          <h1>Welcome to Gramps Web</h1>

          <h3>
            Create an admin account
            ${this.stateUser !== STATE_INITIAL
              ? html`
                  <span class="icon">
                    ${renderIcon(mdiCheckCircle, '#41AD49')}
                  </span>
                `
              : ''}
          </h3>

          <p>Enter the details for the admin user.</p>

          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            id="username"
            label="Username"
            type="text"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            id="password"
            label="Password"
            type="password"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            required
            id="email"
            label="E-mail"
            type="email"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="full_name"
            label="Full name"
            type="text"
          ></mwc-textfield>

          <h3>
            E-mail settings
            ${this.stateConfig !== STATE_INITIAL
              ? html`
                  <span class="icon">
                    ${renderIcon(mdiCheckCircle, '#41AD49')}
                  </span>
                `
              : ''}
          </h3>

          <p>
            Optionally, enter existing IMAP credentials to enable e-mail
            notifications required e.g. for user registration.
          </p>

          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="email_host"
            label="SMTP host"
            type="text"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="email_port"
            label="SMTP port"
            type="text"
            pattern="[0-9]+"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="email_user"
            label="SMTP user"
            type="text"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="email_pw"
            label="SMTP password"
            type="password"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="email_from"
            label="From address"
            type="email"
          ></mwc-textfield>
          <mwc-textfield
            @input="${this.checkValidity}"
            outlined
            id="base_url"
            label="Gramps Web base URL"
            type="url"
            placeholder="https://grampsweb.mydomain.com"
          ></mwc-textfield>

          <h3>
            Upload family tree
            ${this.stateTree !== STATE_INITIAL
              ? html`
                  <span class="icon">
                    ${renderIcon(mdiCheckCircle, '#41AD49')}
                  </span>
                `
              : ''}
          </h3>

          <p>Optionally, upload existing family tree data.</p>

          <p>
            <grampsjs-form-upload
              filename
              @formdata:changed="${this._handleUploadChanged}"
              ?disabled="${this.stateUser === STATE_DONE}"
            ></grampsjs-form-upload>
          </p>
          ${this._uploadHint ? html`${this._uploadHint}` : ''}

          <p style="margin-top: 2em;">
            Need help? Check out
            <a href="https://gramps-project.github.io/web/Deployment/"
              >the documentation</a
            >.
          </p>

          <h3>Submit</h3>

          <mwc-button
            raised
            label="submit"
            type="submit"
            @click="${this._submit}"
            ?disabled=${this.stateUser !== STATE_READY}
          >
          </mwc-button>

          <p>
            ${this._showProgress('Creating owner account', this.stateUser)}
            ${this._showProgress('Storing configuration', this.stateConfig)}
            ${this._showProgress('Importing family tree', this.stateTree)}
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
    `;
  }

  _showProgress(text, status) {
    if (status === STATE_PROGRESS) {
      return html`
        <br />
        ${text}
        <span class="icon">
          <mwc-circular-progress
            indeterminate
            density="-7"
          ></mwc-circular-progress>
        </span>
      `;
    }
    if (status === STATE_DONE) {
      return html`
      <br>
      <span class="success">${text}</a>
      <span class="icon">
        ${renderIcon(mdiCheckCircle, '#41AD49')}
      </span>
      `;
    }
    if (status === STATE_ERROR) {
      return html`
      <br>
      <span class="error">${text}</a>
      <span class="icon">
        ${renderIcon(mdiCloseCircle, '#BF360C')}
      </span>
      `;
    }
    return '';
  }

  async _submit() {
    const username = this.shadowRoot.querySelector('#username')?.value || '';
    const password = this.shadowRoot.querySelector('#password')?.value || '';
    const email = this.shadowRoot.querySelector('#email')?.value || '';
    const fullName = this.shadowRoot.querySelector('#full_name')?.value || '';
    await this._submitUser(username, password, email, fullName);
    if (this.stateUser === STATE_ERROR) {
      return;
    } else {
      const resp = await apiGetTokens(username, password);
      if ('error' in resp) {
        this.stateUser = STATE_ERROR;
        return;
      }
    }
    if (this.stateConfig === STATE_READY) {
      await this._submitConfig();
      if (this.stateConfig !== STATE_ERROR) {
        this.stateConfig = STATE_DONE;
      }
    }
    if (this.stateTree === STATE_READY) {
      const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload');
      const ext = uploadForm.file.name.split('.').pop().toLowerCase();
      await this._submitTree(ext, uploadForm.file);
    }
  }

  async _submitUser(username, password, email, fullName) {
    this.stateUser = STATE_PROGRESS;
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
            password: password,
            email: email,
            full_name: fullName,
          }),
        }
      );
      if (resp.status === 201) {
        this.stateUser = STATE_DONE;
        const btn = this.shadowRoot.querySelector('#start-btn');
        if (btn) {
          btn.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
        return;
      } else {
        throw new Error(`Error ${resp.status}`);
      }
    } catch (error) {
      this.stateUser = STATE_ERROR;
    }
  }

  async _submitConfig() {
    this.stateConfig = STATE_PROGRESS;
    for (const elId of Object.keys(CONFIG_KEYS)) {
      const key = CONFIG_KEYS[elId];
      const value = this.shadowRoot.querySelector(elId);
      if (value && value?.value) {
        await this._submitConfigSingle(key, value.value);
      }
    }
  }

  async _submitConfigSingle(key, value) {
    const res = await apiPut(`/api/config/${key}/`, {
      value: value,
    });
    if ('error' in res) {
      this.stateConfig = STATE_ERROR;
    }
  }

  async _submitTree(ext, file) {
    this.stateTree = STATE_PROGRESS;
    const res = await apiPost(`/api/importers/${ext}/file`, file, false);
    if ('error' in res) {
      this.stateTree = STATE_ERROR;
    } else {
      this.stateTree = STATE_DONE;
    }
  }

  _done() {
    fireEvent(this, 'firstrun:done');
  }

  _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload');
    if (!uploadForm.file?.name) {
      this._uploadHint = '';
      this.stateTree = STATE_INITIAL;
      return;
    }

    const ext = uploadForm.file.name.split('.').pop().toLowerCase();
    if (!['gpkg', 'gramps', 'gw', 'def', 'vcf', 'csv', 'ged'].includes(ext)) {
      this._uploadHint = html`<p class="alert error">Unsupported format</p>`;
      this.stateTree = STATE_INITIAL;
      return;
    }
    if (ext === 'gpkg') {
      this._uploadHint = html`<p class="alert error">
        The Gramps package format (.gpkg) is currently not supported. Please
        upload a file in Gramps XML (.gramps) format without media files.
      </p>`;
      this.stateTree = STATE_INITIAL;
      return;
    } else if (ext !== 'gramps') {
      this._uploadHint = html`<p class="alert warn">
        If you intend to synchronize an existing Gramps database with Gramps
        Web, use the Gramps XML (.gramps) format instead.
      </p>`;
    } else {
      this._uploadHint = '';
    }
    this.stateTree = STATE_READY;
  }

  checkValidity() {
    if (this.stateUser === STATE_INITIAL && this._checkValidityUser()) {
      this.stateUser = STATE_READY;
    } else if (this.stateUser === STATE_READY && !this._checkValidityUser()) {
      this.stateUser = STATE_INITIAL;
    }
    if (this.stateConfig === STATE_INITIAL && this._checkValidityConfig()) {
      this.stateConfig = STATE_READY;
    } else if (
      this.stateConfig === STATE_READY &&
      !this._checkValidityConfig()
    ) {
      this.stateConfig = STATE_INITIAL;
    }
  }

  _checkValidityUser() {
    const username = this.shadowRoot.getElementById('username');
    const password = this.shadowRoot.getElementById('password');
    const fullName = this.shadowRoot.getElementById('full_name');
    const email = this.shadowRoot.getElementById('email');
    return (
      (username?.validity?.valid &&
        password?.validity?.valid &&
        fullName?.validity?.valid &&
        email?.validity?.valid) ||
      false
    );
  }

  _checkValidityConfig() {
    const host = this.shadowRoot.getElementById('email_host');
    const port = this.shadowRoot.getElementById('email_port');
    const user = this.shadowRoot.getElementById('email_user');
    const pw = this.shadowRoot.getElementById('email_pw');
    const from = this.shadowRoot.getElementById('email_from');
    const url = this.shadowRoot.getElementById('base_url');
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
    );
  }
}

window.customElements.define('grampsjs-first-run', GrampsjsFirstRun);
