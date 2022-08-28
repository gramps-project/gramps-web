import {html, css} from 'lit'
import {ListItem} from '@material/mwc-list/mwc-list-item'

export class GrampsjsListItem extends ListItem {
  static get properties() {
    return {
      href: {type: String},
    }
  }

  static get styles() {
    return [
      super.styles,
      css`
        a {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
        }
      `,
    ]
  }

  render() {
    const r = super.render()
    const href = this.href ? `${this.href}` : ''

    return html` ${this.renderRipple()}
      <a href=${href}> ${r} </a>`
  }
}

window.customElements.define('grampsjs-list-item', GrampsjsListItem)
