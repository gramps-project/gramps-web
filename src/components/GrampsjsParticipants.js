import {html, css} from 'lit'
import {mdiStar} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsImg.js'
import './GrampsjsIcon.js'
import {
  personTitleFromProfile,
  familyTitleFromProfile,
  fireEvent,
  renderIcon,
} from '../util.js'

const PRIMARY_ROLES_EN = new Set(['Primary', 'Family'])

export class GrampsjsParticipants extends GrampsjsEditableList {
  static get styles() {
    return [
      ...super.styles,
      css`
        span[slot='supporting-text'] {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        grampsjs-icon.role-star {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      backlinksPeople: {type: Array},
      backlinksFamilies: {type: Array},
    }
  }

  constructor() {
    super()
    this.hasAdd = false
    this.backlinksPeople = []
    this.backlinksFamilies = []
  }

  _isPrimaryRole(role) {
    return (
      PRIMARY_ROLES_EN.has(role) ||
      role === this._('Primary') ||
      role === this._('Family')
    )
  }

  _sortByPrimary(arr) {
    return [...arr].sort((a, b) => {
      const aP = this._isPrimaryRole(a.role) ? 0 : 1
      const bP = this._isPrimaryRole(b.role) ? 0 : 1
      return aP - bP
    })
  }

  _roleLabel(role) {
    return html`
      <span slot="supporting-text">
        ${this._isPrimaryRole(role)
          ? html`<grampsjs-icon
              class="role-star"
              path="${mdiStar}"
              color="currentColor"
            ></grampsjs-icon>`
          : ''}
        ${this._(role)}
      </span>
    `
  }

  render() {
    if (!this.data[0] || Object.keys(this.data[0]).length === 0) {
      return html``
    }
    const peopleByGrampsId = Object.fromEntries(
      this.backlinksPeople.map(p => [p.gramps_id, p])
    )
    const familiesByGrampsId = Object.fromEntries(
      this.backlinksFamilies.map(f => [f.gramps_id, f])
    )
    return html`
      <md-list>
        ${this._sortByPrimary(this.data[0].families).map(
          obj => html`
            <md-list-item
              type="button"
              @click="${() =>
                fireEvent(this, 'nav', {
                  path: `family/${obj.family.gramps_id}`,
                })}"
            >
              ${familyTitleFromProfile(obj.family) || ''}
              ${this._roleLabel(obj.role)}
              ${renderIcon(
                {
                  object_type: 'family',
                  object: familiesByGrampsId[obj.family.gramps_id] ?? {},
                },
                'start'
              )}
            </md-list-item>
          `
        )}
        ${this._sortByPrimary(this.data[0].people).map(
          obj => html`
            <md-list-item
              type="button"
              @click="${() =>
                fireEvent(this, 'nav', {
                  path: `person/${obj.person.gramps_id}`,
                })}"
            >
              ${personTitleFromProfile(obj.person) || ''}
              ${this._roleLabel(obj.role)}
              ${renderIcon(
                {
                  object_type: 'person',
                  object: peopleByGrampsId[obj.person.gramps_id] ?? {},
                },
                'start'
              )}
            </md-list-item>
          `
        )}
      </md-list>
    `
  }
}

window.customElements.define('grampsjs-participants', GrampsjsParticipants)
