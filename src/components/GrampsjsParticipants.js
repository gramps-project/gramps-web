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

  // Flatten {families, people} into a sorted normalized array for the base render()
  sortData(dataCopy) {
    const participants = dataCopy[0]
    if (!participants || Object.keys(participants).length === 0) return []

    const peopleByGrampsId = Object.fromEntries(
      this.backlinksPeople.map(p => [p.gramps_id, p])
    )
    const familiesByGrampsId = Object.fromEntries(
      this.backlinksFamilies.map(f => [f.gramps_id, f])
    )

    const families = (participants.families || []).map(obj => ({
      object_type: 'family',
      role: obj.role,
      backlink: familiesByGrampsId[obj.family.gramps_id] ?? {},
      title: familyTitleFromProfile(obj.family) || '',
      path: `family/${obj.family.gramps_id}`,
    }))

    const people = (participants.people || []).map(obj => ({
      object_type: 'person',
      role: obj.role,
      backlink: peopleByGrampsId[obj.person.gramps_id] ?? {},
      title: personTitleFromProfile(obj.person) || '',
      path: `person/${obj.person.gramps_id}`,
    }))

    return [...families, ...people].sort((a, b) => {
      const aP = this._isPrimaryRole(a.role) ? 0 : 1
      const bP = this._isPrimaryRole(b.role) ? 0 : 1
      return aP - bP
    })
  }

  row(obj) {
    return html`
      <md-list-item
        type="button"
        @click="${() => fireEvent(this, 'nav', {path: obj.path})}"
      >
        ${obj.title} ${this._roleLabel(obj.role)}
        ${renderIcon(
          {object_type: obj.object_type, object: obj.backlink},
          'start'
        )}
      </md-list-item>
    `
  }
}

window.customElements.define('grampsjs-participants', GrampsjsParticipants)
