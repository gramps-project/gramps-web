import {css, html, LitElement} from 'lit'

import './GrampsjsFormSelectObject.js'
import './GrampsjsFormEditName.js'
import './GrampsjsObjectForm.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsName extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h4 {
          clear: left;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    return html`
      <h4>${this._(this.data.type)}</h4>
      <dl>
        ${this.data.title
          ? html`
              <div>
                <dt>${this._('Title')}</dt>
                <dd>${this.data.title}</dd>
              </div>
            `
          : ''}
        ${this.data.first_name
          ? html`
              <div>
                <dt>${this._('Given name')}</dt>
                <dd>${this.data.first_name}</dd>
              </div>
            `
          : ''}
        ${this.data.suffix
          ? html`
              <div>
                <dt>${this._('Suffix')}</dt>
                <dd>${this.data.suffix}</dd>
              </div>
            `
          : ''}
        ${this.data.call
          ? html`
              <div>
                <dt>${this._('Call name')}</dt>
                <dd>${this.data.call}</dd>
              </div>
            `
          : ''}
        ${this.data.nick
          ? html`
              <div>
                <dt>${this._('Nickname')}</dt>
                <dd>${this.data.nick}</dd>
              </div>
            `
          : ''}
        ${this.data.surname_list.length > 0
          ? html`
              ${this.data.surname_list.map(
                surname => html`
                  <div>
                    <dt>
                      ${this._('Surname')}
                      ${surname.origintype
                        ? html`(${this._(surname.origintype)})`
                        : ''}
                    </dt>
                    <dd>
                      ${surname.prefix} ${surname.surname} ${surname.connector}
                    </dd>
                  </div>
                `
              )}
            `
          : ''}
        ${this.data.famnick
          ? html`
              <div>
                <dt>${this._('Family nick name')}</dt>
                <dd>${this.data.famnick}</dd>
              </div>
            `
          : ''}
      </dl>
    `
  }
}

window.customElements.define('grampsjs-name', GrampsjsName)
