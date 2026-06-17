/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import {
  mdiAccount,
  mdiAccountMultiple,
  mdiCalendar,
  mdiMapMarker,
  mdiBookOpenVariant,
  mdiBookmark,
  mdiArchive,
  mdiTextBox,
  mdiImage,
  mdiFormatListChecks,
} from '@mdi/js'
import '@material/mwc-icon-button'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/divider/divider'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'

const BASE_DIR = ''

const menuItems = [
  ['Person', '/new_person', mdiAccount],
  ['Family', '/new_family', mdiAccountMultiple],
  ['Event', '/new_event', mdiCalendar],
  ['Place', '/new_place', mdiMapMarker],
  ['Source', '/new_source', mdiBookOpenVariant],
  ['Citation', '/new_citation', mdiBookmark],
  ['Repository', '/new_repository', mdiArchive],
  ['Note', '/new_note', mdiTextBox],
  ['Media Object', '/new_media', mdiImage],
  ['Task', '/new_task', mdiFormatListChecks],
]

class GrampsjsAddMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-menu {
          --md-divider-thickness: 1px;
          --md-divider-color: var(--grampsjs-body-font-color-30);
        }

        md-menu-item {
          --md-menu-item-top-space: 0px;
          --md-menu-item-bottom-space: 0px;
          --md-menu-item-one-line-container-height: 48px;
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

  _menuItem(title, url, iconPath) {
    return html`
      <md-menu-item href="${BASE_DIR}${url}" graphic="icon">
        <span slot="headline">${this._(title)}</span>
        <grampsjs-icon
          slot="start"
          path="${iconPath}"
          color="var(--grampsjs-body-font-color-35)"
        ></grampsjs-icon>
      </md-menu-item>
    `
  }

  _handleClickAdd() {
    const menu = this.shadowRoot.getElementById('menu_add')
    menu.open = !menu.open
  }
}

window.customElements.define('grampsjs-add-menu', GrampsjsAddMenu)
