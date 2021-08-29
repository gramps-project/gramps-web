/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import './GrampsJsListItem.js'

import {sharedStyles} from '../SharedStyles.js'

const BASE_DIR = ''

const menuItems = [
  // ['Person', '/new_person', 'person'],
  // ['Family', '/new_family', 'people'],
  ['Event', '/new_event', 'event'],
  ['Place', '/new_place', 'place'],
  ['Source', '/new_source', 'bookmarks'],
  ['Citation', '/new_citation', 'bookmark'],
  ['Repository', '/new_repository', 'account_balance'],
  ['Note', '/new_note', 'sticky_note_2'],
  ['Media Object', '/new_media', 'photo']
]

class GrampsjsAddMenu extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
      mwc-menu {
        --mdc-list-item-graphic-margin: 16px;
      }

      mwc-list-item.header {
        font-size: 14px;
        color: #666;
        font-weight: 400;
      }
      `
    ]
  }


  static get properties() {
    return {
      strings: {type: Object}
    }
  }

  render() {
    return html`
  <div style="position: relative;">
    <mwc-icon-button icon="add" @click="${this._handleClickAdd}" id="button_add"></mwc-icon-button>
    <mwc-menu id="menu_add" corner="BOTTOM_RIGHT" menuCorner="END" x="0" y="0">
      <mwc-list-item noninteractive class="header">${this._('Add')}</mwc-list-item>
      <li divider role="separator"></li>
      ${menuItems.map(menuItem => this._menuItem(...menuItem))}
    </mwc-menu>
  </div>
`
  }

  _menuItem(title, url, icon) {
    return html`
    <grampsjs-list-item href="${BASE_DIR}${url}" graphic="icon">
      <span>${this._(title)}</span>
      <mwc-icon slot="graphic">${icon}</mwc-icon>
    </grampsjs-list-item>
    `
  }

  firstUpdated() {
    const btn = this.shadowRoot.getElementById('button_add')
    const menu = this.shadowRoot.getElementById('menu_add')
    menu.anchor = btn
  }

  _handleClickAdd() {
    const menu = this.shadowRoot.getElementById('menu_add')
    menu.open = !menu.open
  }

  _(s) {
    if (s in this.strings) {
      return this.strings[s]
    }
    return s
  }

}

window.customElements.define('grampsjs-add-menu', GrampsjsAddMenu)
