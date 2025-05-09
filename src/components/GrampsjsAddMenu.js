/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/divider/divider'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

const BASE_DIR = ''

const menuItems = [
  ['Person', '/new_person', 'person'],
  ['Family', '/new_family', 'people'],
  ['Event', '/new_event', 'event'],
  ['Place', '/new_place', 'place'],
  ['Source', '/new_source', 'bookmarks'],
  ['Citation', '/new_citation', 'bookmark'],
  ['Repository', '/new_repository', 'account_balance'],
  ['Note', '/new_note', 'sticky_note_2'],
  ['Media Object', '/new_media', 'photo'],
  ['Task', '/new_task', 'task_alt'],
]

class GrampsjsAddMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-menu {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.3);
        }

        md-menu-item {
          --md-menu-item-top-space: 0px;
          --md-menu-item-bottom-space: 0px;
          --md-menu-item-one-line-container-height: 48px;
        }

        md-menu-item mwc-icon {
          color: rgba(0, 0, 0, 0.35);
        }

        md-menu-item.header {
          --md-menu-item-disabled-opacity: 0.6;
          --md-menu-item-one-line-container-height: 32px;
          --md-menu-item-label-text-size: 14px;
          --md-menu-item-label-text-weight: 400;
        }
      `,
    ]
  }

  render() {
    return html`
      <div style="position: relative;">
        <mwc-icon-button
          icon="add"
          @click="${this._handleClickAdd}"
          id="button_add"
        ></mwc-icon-button>

        <md-menu
          id="menu_add"
          anchor="button_add"
          anchor-corner="start-end"
          menu-corner="end-end"
        >
          <md-menu-item disabled class="header"
            ><div slot="headline">${this._('Add')}</div></md-menu-item
          >
          <md-divider role="separator" tabindex="-1"></md-divider>
          ${menuItems.map(menuItem => this._menuItem(...menuItem))}
        </md-menu>
      </div>
    `
  }

  _menuItem(title, url, icon) {
    return html`
      <md-menu-item href="${BASE_DIR}${url}" graphic="icon">
        <span slot="headline">${this._(title)}</span>
        <mwc-icon slot="start">${icon}</mwc-icon>
      </md-menu-item>
    `
  }

  _handleClickAdd() {
    const menu = this.shadowRoot.getElementById('menu_add')
    menu.open = !menu.open
  }
}

window.customElements.define('grampsjs-add-menu', GrampsjsAddMenu)
