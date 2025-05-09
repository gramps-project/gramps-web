/*
The dropdown menu for adding objects in the top app bar
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/web/icon/icon'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'
import '@material/web/divider/divider'

import {
  mdiLogout,
  mdiInformation,
  mdiWrench,
  mdiAccountMultiple,
  mdiAccountCog,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {renderIconSvg} from '../icons.js'
import {clickKeyHandler} from '../util.js'

const menuItems = [
  ['User settings', '/settings/user', mdiAccountCog],
  ['Administration', '/settings/administration', mdiWrench],
  ['Manage users', '/settings/users', mdiAccountMultiple],
  ['System Information', '/settings/info', mdiInformation],
]

class GrampsjsSettingsMenu extends GrampsjsAppStateMixin(LitElement) {
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
          --md-menu-item-one-line-container-height: 56px;
          --icon-color: rgba(0, 0, 0, 0.35);
        }
        md-menu-item.red {
          --md-menu-item-label-text-color: var(--icon-color);
          --icon-color: #c62828;
        }
        md-menu {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.3);
        }
      `,
    ]
  }

  render() {
    return html`
      <div style="position: relative;">
        <mwc-icon-button
          icon="account_circle"
          @click="${this._handleClickSettings}"
          id="button_settings"
        ></mwc-icon-button>

        <md-menu
          id="menu_settings"
          anchor="button_settings"
          anchor-corner="start-end"
          menu-corner="end-end"
        >
        ${menuItems.map(menuItem => this._menuItem(...menuItem))}
          <md-divider role="separator" tabindex="-1"></md-divider>
          <md-menu-item class="red"
            @click="${() => this.appState.signout()}"
            @keydown="${clickKeyHandler}"
          >
            <div slot="headline">${this._('Log out')}</div>
            <md-icon slot="start">${renderIconSvg(
              mdiLogout,
              'var(--icon-color)'
            )}</md-icon>
          </md-menu-item>
      </div>
    `
  }

  _menuItem(title, url, icon) {
    return html`
      <md-menu-item href="${url}">
        <div slot="headline">${this._(title)}</div>
        <md-icon slot="start"
          >${renderIconSvg(icon, 'var(--icon-color)')}</md-icon
        >
      </md-menu-item>
    `
  }

  _handleClickSettings() {
    const menu = this.shadowRoot.getElementById('menu_settings')
    menu.open = !menu.open
  }
}

window.customElements.define('grampsjs-settings-menu', GrampsjsSettingsMenu)
