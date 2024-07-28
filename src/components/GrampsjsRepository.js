import {html, css} from 'lit'
import {live} from 'lit/directives/live.js'
import {classMap} from 'lit/directives/class-map.js'
import {GrampsjsObject} from './GrampsjsObject.js'
import {debounce, fireEvent} from '../util.js'

export class GrampsjsRepository extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Repositories'
    this._objectEndpoint = 'repositories'
    this._objectIcon = 'account_balance'
  }

  renderProfile() {
    return html`
      <h2
        id="name"
        class="${classMap({editable: this.edit})}"
        contenteditable="${this.edit}"
        @input="${debounce(() => this._handleEditName(), 500)}"
        .innerText="${live(this.data.name)}"
      >
        &nbsp;
      </h2>
      <dl>
        ${this.data?.type
          ? html`
      <dt>${this._('Type')}</dt>
      <dd>${this._(this.data.type)}</dd>
    </dl>`
          : ''}
      </dl>
    `
  }

  _handleEditName() {
    const element = this.renderRoot.getElementById('name')
    const name = element.textContent
      .replace(/(\r\n|\n|\r)/gm, '') // remove line breaks
      .trim()
    element.blur()
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {name},
    })
  }
}

window.customElements.define('grampsjs-repository', GrampsjsRepository)
