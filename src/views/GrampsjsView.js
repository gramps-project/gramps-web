/*
Base class for Gramps views
*/

import {LitElement, html, css} from 'lit-element'
import {sharedStyles} from '../SharedStyles.js'


export class GrampsjsView extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`

      :host {
        margin: 25px 40px;
        background-color: #ffffff;
      }

      `
    ]
  }

  // shouldUpdate() {
  //   return this.active;
  // }

  static get properties() {
    return {
      active: {type: Boolean},
      strings: {type: Object},
      loading: {type: Boolean},
      error: {type: Boolean},
      settings: {type: Object},
      _errorMessage: {type: String}
    }
  }

  constructor() {
    super()
    this.strings = {}
    this.active = false
    this.loading = false
    this.error = false
    this.settings = {}
    this._errorMessage = ''
  }


  render() {
    if (this.error) {
      this.dispatchEvent(new CustomEvent('grampsjs:error', {bubbles: true, composed: true, detail: {message: this._errorMessage}}))
    }
    return this.renderContent()
  }

  update(changed) {
    super.update(changed)
    if (changed.has('loading')) {
      if (this.loading && this.active) {
        this.dispatchEvent(new CustomEvent('progress:on', {bubbles: true, composed: true}))
      }
      else if (!this.loading && this.active) {
        this.dispatchEvent(new CustomEvent('progress:off', {bubbles: true, composed: true}))
      }
    }
    if (changed.has('active')) {
      if (!this.active) {
        this.dispatchEvent(new CustomEvent('progress:off', {bubbles: true, composed: true}))
      }
      else if (this.loading) {
        this.dispatchEvent(new CustomEvent('progress:on', {bubbles: true, composed: true}))
      }
    }
  }

  _(s) {
    if (s === undefined) {
      return ''
    }
    if (s in this.strings) {
      return this.strings[s].replace('_', '')
    }
    return s.replace('_', '')
  }

}
