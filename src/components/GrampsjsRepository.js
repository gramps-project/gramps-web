import {html, css} from 'lit'
import {GrampsjsObject} from './GrampsjsObject.js'

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
      <h2>${this.data.name}</h2>
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
}

window.customElements.define('grampsjs-repository', GrampsjsRepository)
