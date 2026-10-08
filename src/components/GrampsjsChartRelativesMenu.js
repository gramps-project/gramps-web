import {html, css, LitElement} from 'lit'

import '@material/web/menu/menu'
import '@material/web/menu/menu-item'

import {sharedStyles, personListItemStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {formatChartName} from '../charts/util.js'
import {fireEvent, menuSelectionHandler} from '../util.js'
import {getSymbols} from '../symbols.js'
import {renderPersonAvatar, renderPersonDates} from './personListUtils.js'

// Returns the 'parents' or 'children', by `relation`, of the person with
// `grampsId` in `graph`, leaving out people who were not fetched
export function rootRelatives(graph, grampsId, relation) {
  const {handle} = graph.personByGrampsId(grampsId) ?? {}
  if (!handle) {
    return []
  }
  const handles =
    relation === 'parents'
      ? Object.values(graph.parents(handle))
      : graph.children(handle)
  return handles
    .map(relative => graph.person(relative))
    .filter(person => person?.gramps_id)
}

// The menu of the `relatives` of a chart's root person, which a chart opens
// from its menu button. Selecting a person fires `pedigree:person-selected`.
class GrampsjsChartRelativesMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      personListItemStyles,
      css`
        md-menu {
          min-width: 200px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      relatives: {type: Array},
      nameDisplayFormat: {type: String},
    }
  }

  constructor() {
    super()
    this.relatives = []
  }

  render() {
    if (this.relatives.length === 0) {
      return ''
    }
    const symbols = getSymbols(this.appState.settings, s => this._(s))
    return html`
      <md-menu
        positioning="fixed"
        @close-menu=${menuSelectionHandler(item =>
          fireEvent(this, 'pedigree:person-selected', {
            grampsId: item.dataset.grampsId,
          })
        )}
      >
        ${this.relatives.map(
          person => html`
            <md-menu-item data-gramps-id="${person.gramps_id}">
              ${renderPersonAvatar(person, person.profile?.sex)}
              <div slot="headline">
                ${formatChartName(person.profile, this.nameDisplayFormat)}
              </div>
              ${renderPersonDates(person.profile, symbols)}
            </md-menu-item>
          `
        )}
      </md-menu>
    `
  }

  // Opens the menu at `anchor`, the element of the menu button
  open(anchor) {
    const menu = this.renderRoot.querySelector('md-menu')
    if (menu && anchor) {
      menu.anchorElement = anchor
      menu.open = true
    }
  }
}

window.customElements.define(
  'grampsjs-chart-relatives-menu',
  GrampsjsChartRelativesMenu
)
