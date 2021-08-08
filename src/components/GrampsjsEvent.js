import {html, css} from 'lit'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'

const BASE_DIR = ''

export class GrampsjsEvent extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }

  constructor() {
    super()
    this._showReferences = false
  }

  renderProfile() {
    return html`
    <h2><mwc-icon class="person">event</mwc-icon> ${this._renderTitle()}</h2>
    ${this.data.description ? html`<p>${this.data.description}</p>` : ''}
    <dl>
      ${this.data?.profile?.date ? html`
      <div>
        <dt>${this._('Date')}</dt>
        <dd>${this.data.profile.date}</dd>
      </div>
      ` : ''}
      ${this.data?.profile?.place ? html`
      <div>
        <dt>${this._('Place')}</dt>
        <dd><a href="${BASE_DIR}/place/${this.data.extended.place.gramps_id}">${this.data.profile.place}</a></dd>
      </div>
      ` : ''}
    </dl>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderPerson(obj) {
    if (obj === undefined) {
      return ''
    }
    return `${obj?.name_given || '…'} ${obj?.name_surname || '…'}`
  }

  // eslint-disable-next-line class-methods-use-this
  _renderFamily(obj) {
    if (obj === undefined) {
      return ''
    }
    return `${this._renderPerson(obj.family?.father)} & ${this._renderPerson(obj.family?.mother)}`
  }


  _renderPrimaryPeople() {
    const primary = this._('Primary')
    const family = this._('Family')
    const people = this.data?.profile?.participants?.people.filter((obj) => obj.role === primary) || []
    const families = this.data?.profile?.participants?.families.filter((obj) => obj.role === family) || []
    return `${people.map((obj) => this._renderPerson(obj.person), this).join(', ')}
            ${families.map((obj) => this._renderFamily(obj), this).join(', ')}`
  }


  _renderTitle() {
    return html`${this.data.profile.type}: ${this._renderPrimaryPeople()}`
  }
}


window.customElements.define('grampsjs-event', GrampsjsEvent)
