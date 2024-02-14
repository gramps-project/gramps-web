/* eslint-disable lit-a11y/click-events-have-key-events */
import {html, css, LitElement} from 'lit'

import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'
import {apiPost} from '../api.js'
import {clickKeyHandler, fireEvent} from '../util.js'

class GrampsjsUpgradeDb extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .center-xy {
          display: flex;
          justify-content: center;
          text-align: center;
          align-items: center;
          margin: 0 auto;
          height: 100vh;
        }

        .center-xy div {
          display: block;
          max-width: 30em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      dbInfo: {type: Object},
    }
  }

  constructor() {
    super()
    this.dbInfo = {}
  }

  render() {
    return html`<div class="center-xy">
      <div>
        ${this._(
          'The Family Tree you are trying to load is in a schema version not supported by this version of Gramps Web. Therefore you cannot load this Family Tree without upgrading its schema. This action cannot be undone.'
        )}<br /><br />
        <mwc-button
          raised
          @click="${this._upgradeDb}"
          @keydown="${clickKeyHandler}"
          >${this._('Upgrade Family Tree')}</mwc-button
        >
        <grampsjs-task-progress-indicator
          class="button"
          size="20"
          @task:complete="${this._handleUpgradeComplete}"
        ></grampsjs-task-progress-indicator>
      </div>
    </div>`
  }

  async _upgradeDb() {
    const prog = this.renderRoot.querySelector(
      'grampsjs-task-progress-indicator'
    )
    prog.reset()
    prog.open = true
    const data = await apiPost('/api/trees/-/migrate')
    if ('error' in data) {
      prog.setError()
      prog.errorMessage = data.error
    } else if ('task' in data) {
      prog.taskId = data.task?.id || ''
    } else {
      prog.setComplete()
    }
  }

  _handleUpgradeComplete() {
    fireEvent(this, 'dbupgrade:complete')
  }
}

window.customElements.define('grampsjs-upgrade-db', GrampsjsUpgradeDb)
