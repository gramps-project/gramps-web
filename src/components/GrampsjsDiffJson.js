import {html, css, LitElement} from 'lit'
import {unsafeHTML} from 'lit/directives/unsafe-html.js'

import {diff} from 'jsondiffpatch'
import * as htmlFormatter from '../../node_modules/jsondiffpatch/lib/formatters/html.js'

import {sharedStyles} from '../SharedStyles.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsDiffJson extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          --color-red: #ffebe9;
          --color-green: #dafbe1;
          --color-blue: #ddf4ff;
          color: #222;
        }

        #container {
          overflow: hidden;
          border: 1px solid var(--grampsjs-body-font-color-20);
          border-radius: 8px;
          padding: 20px 8px;
        }

        .jsondiffpatch-delta {
          font-family: 'Commit Mono';
          font-size: 14px;
          margin: 0;
          padding: 0 0 0 14px;
          display: inline-block;
        }
        .jsondiffpatch-delta pre {
          font-family: 'Commit Mono';
          font-size: 14px;
          margin: 0;
          padding: 0;
          display: inline-block;
        }
        ul.jsondiffpatch-delta {
          list-style-type: none;
          padding: 0 0 0 22px;
          margin: 0;
        }
        .jsondiffpatch-delta ul {
          list-style-type: none;
          padding: 0 0 0 22px;
          margin: 0;
        }
        .jsondiffpatch-added .jsondiffpatch-property-name,
        .jsondiffpatch-added .jsondiffpatch-value pre,
        .jsondiffpatch-modified .jsondiffpatch-right-value pre,
        .jsondiffpatch-textdiff-added {
          background: var(--color-green);
        }
        .jsondiffpatch-deleted .jsondiffpatch-property-name,
        .jsondiffpatch-deleted pre,
        .jsondiffpatch-modified .jsondiffpatch-left-value pre,
        .jsondiffpatch-textdiff-deleted {
          background: var(--color-red);
          text-decoration: line-through;
          text-decoration-color: var(--grampsjs-body-font-color-20);
          text-decoration-thickness: 1px;
        }
        .jsondiffpatch-unchanged,
        .jsondiffpatch-movedestination {
          color: gray;
        }
        .jsondiffpatch-unchanged,
        .jsondiffpatch-movedestination > .jsondiffpatch-value {
          transition: all 0.5s;
          -webkit-transition: all 0.5s;
          overflow-y: hidden;
        }
        .jsondiffpatch-unchanged-showing .jsondiffpatch-unchanged,
        .jsondiffpatch-unchanged-showing
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value {
          max-height: 100px;
        }
        .jsondiffpatch-unchanged-hidden .jsondiffpatch-unchanged,
        .jsondiffpatch-unchanged-hidden
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value {
          max-height: 0;
        }
        .jsondiffpatch-unchanged-hiding
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value,
        .jsondiffpatch-unchanged-hidden
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value {
          display: block;
        }
        .jsondiffpatch-unchanged-visible .jsondiffpatch-unchanged,
        .jsondiffpatch-unchanged-visible
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value {
          max-height: 100px;
        }
        .jsondiffpatch-unchanged-hiding .jsondiffpatch-unchanged,
        .jsondiffpatch-unchanged-hiding
          .jsondiffpatch-movedestination
          > .jsondiffpatch-value {
          max-height: 0;
        }
        .jsondiffpatch-unchanged-showing .jsondiffpatch-arrow,
        .jsondiffpatch-unchanged-hiding .jsondiffpatch-arrow {
          display: none;
        }
        .jsondiffpatch-value {
          display: inline-block;
        }
        .jsondiffpatch-property-name {
          display: inline-block;
          padding-right: 5px;
          vertical-align: top;
        }
        .jsondiffpatch-property-name:after {
          content: ': ';
        }
        .jsondiffpatch-child-node-type-array
          > .jsondiffpatch-property-name:after {
          content: ': [';
        }
        .jsondiffpatch-child-node-type-array:after {
          content: '],';
        }
        div.jsondiffpatch-child-node-type-array:before {
          content: '[';
        }
        div.jsondiffpatch-child-node-type-array:after {
          content: ']';
        }
        .jsondiffpatch-child-node-type-object
          > .jsondiffpatch-property-name:after {
          content: ': {';
        }
        .jsondiffpatch-child-node-type-object:after {
          content: '},';
        }
        div.jsondiffpatch-child-node-type-object:before {
          content: '{';
        }
        div.jsondiffpatch-child-node-type-object:after {
          content: '}';
        }
        .jsondiffpatch-value pre:after {
          content: ',';
        }
        li:last-child > .jsondiffpatch-value pre:after,
        .jsondiffpatch-modified > .jsondiffpatch-left-value pre:after {
          content: '';
        }
        .jsondiffpatch-modified .jsondiffpatch-value {
          display: inline-block;
        }
        .jsondiffpatch-modified .jsondiffpatch-right-value {
          margin-left: 5px;
        }
        .jsondiffpatch-moved .jsondiffpatch-value {
          display: none;
        }
        .jsondiffpatch-moved .jsondiffpatch-moved-destination {
          display: inline-block;
          background: var(--color-blue);
          color: #888;
        }
        .jsondiffpatch-moved .jsondiffpatch-moved-destination:before {
          content: ' => ';
        }
        ul.jsondiffpatch-textdiff {
          padding: 0;
        }
        .jsondiffpatch-textdiff-location {
          color: #bbb;
          display: inline-block;
          min-width: 60px;
        }
        .jsondiffpatch-textdiff-line {
          display: inline-block;
        }
        .jsondiffpatch-textdiff-line-number:after {
          content: ',';
        }
        .jsondiffpatch-error {
          background: red;
          color: white;
          font-weight: bold;
        }
      `,
    ]
  }

  static get properties() {
    return {
      left: {type: Object},
      right: {type: Object},
      _diff: {type: Object},
    }
  }

  constructor() {
    super()
    this.left = {}
    this.right = {}
    this._diff = {}
  }

  render() {
    return html`
      <div id="container">
        ${unsafeHTML(htmlFormatter.format(this._diff, this.left))}
      </div>
    `
  }

  updated(changed) {
    if (changed.has('left') || changed.has('right')) {
      this._updateDiff()
    }
  }

  _updateDiff() {
    this._diff = diff(this.left, this.right)
  }
}

window.customElements.define('grampsjs-diff-json', GrampsjsDiffJson)
