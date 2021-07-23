import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsPedigreeCard.js'


class GrampsjsPedigree extends LitElement {

  static get styles() {
    return [
      sharedStyles,
      css`
      div#container {
        position: relative;
      }

      div.card {
        position: absolute;
      }

      div.branch-right, div.branch-left {
        position: absolute;
        border-color: #aaa;
        border-style: solid;
        border-width: 0px;
      }

      div.branch-right.male {
        border-top-left-radius: 15px;
        border-left-width: 1px;
        border-top-width: 1px;
      }

      div.branch-right.female {
        border-bottom-left-radius: 15px;
        border-left-width: 1px;
        border-bottom-width: 1px;
      }

      div.branch-left.male {
        border-bottom-width: 1px;
      }

      div.branch-left.female {
        border-top-width: 1px;
      }

      div.icon svg path {
        fill: #ccc;
      }

      .gray {
        color: #aaa;
      }
      `
    ]
  }


  static get properties() { return {
    grampsId: {type: String},
    people: {type: Array},
    depth: {type: Number}
  }}

  constructor() {
    super()
    this.people = []
    this.depth = 4
  }

  render() {
    const ancestors = this._getTree()
    const children = this._getChildren()
    return html`
      <div id="container" style="height: ${2**(this.depth - 1) * 100}px;">
      ${ancestors.map((g, i) => i > this.depth - 1 ? '' : html`
        ${g.map((p, j) => Object.keys(p).length ? html`
          <div
          class="card"
          style="
            left: ${i * 230}px;
            top: ${((2**(this.depth - i - 1) ) * (j + 0.5) - 0.5) * 100}px;
          ">
            <grampsjs-pedigree-card
              .person=${p}
              @click="${() => this._personSelected(p)}"
            >
            </grampsjs-pedigree-card>
            ${i === 0 ? '' : html`
            <div
            class="branch-right ${p.gender === 1 ? 'male' : 'female'}"
            style="
            left: 0px;
            top: ${p.gender === 1 ? 45 : -(2**(this.depth - i - 2) ) * 100 + 45}px;
            margin-left:-20px;
            width: 20px;
            height: ${(2**(this.depth - i - 2) ) * 100}px;
            "
            >
            </div>
            <div
            class="branch-left ${p.gender === 1 ? 'male' : 'female'}"
            style="
            left: 0px;
            top: ${p.gender === 1 ?  45 : -(2**(this.depth - i - 2) ) * 100 + 45}px;
            margin-left:-40px;
            width: 20px;
            height: ${(2**(this.depth - i - 2) ) * 100}px;
            "
            >
            </div>
            `}
          </div>
        ` : '')}
      `)}
      ${children.map((p, i) => Object.keys(p).length ? html`
        <div
        style="
          height:20px;
          left:0px;
          ${p.family_list.length ? 'font-weight:bold;' : 'font-weight:normal;'}
          font-size:0.8em;
          position: absolute;
          top: ${((2**(this.depth - 0 - 1) ) * (0 + 0.5) - 0.5 + 1) * 100 + i * 20}px;
        ">
        <span class="gray">└</span>&nbsp;<a @click="${() => this._personSelected(p)}" href="tree">${p.profile?.name_given || '…'}</a>
        </div>
      ` : '')}
      </div>
      `
  }

  _getTree() {
    const ancestors = []
    ancestors.push([this._getPerson(this.grampsId)])
    if (this.depth === 1) {
      return ancestors
    }
    ancestors.push(this._getParents(this.grampsId))
    if (this.depth === 2) {
      return ancestors
    }
    for (let i = 3; i <= this.depth; i += 1){
      ancestors.push(ancestors.slice(-1)[0].map((p) => this._getParents(p.gramps_id)).flat())
    }
    return ancestors
  }

  _getPerson(grampsId) {
    return this.people.find(person => person.gramps_id === grampsId) || {}
  }

  _getPersonByHandle(handle) {
    return this.people.find(person => person.handle === handle) || {}
  }

  _getParents(grampsId) {
    const person = this._getPerson(grampsId)
    const fatherHandle = person?.profile?.primary_parent_family?.father?.handle || {}
    const motherHandle = person?.profile?.primary_parent_family?.mother?.handle || {}
    const father = this._getPersonByHandle(fatherHandle) || {}
    const mother = this._getPersonByHandle(motherHandle) || {}
    return [father, mother]
  }


  _getChildren() {
    const person = this._getPerson(this.grampsId)
    const families = person?.profile?.families || []
    const childHandles = families.map(family => (family.children || []).map(child => child.handle))
    return childHandles.flat().filter(h => h !== undefined).map(this._getPersonByHandle, this)
  }

  _personSelected(person) {
    this.dispatchEvent(new CustomEvent('pedigree:person-selected', {bubbles: true, composed: true, detail: {grampsId: person.gramps_id}}))
  }
}

window.customElements.define('grampsjs-pedigree', GrampsjsPedigree)
