/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/mwc-textfield'
import '@material/mwc-icon-button'
import '@material/mwc-icon'

import {sharedStyles} from '../SharedStyles.js'
import {translate, fireEvent} from '../util.js'
import './GrampsjsFormString.js'
import {classMap} from 'lit/directives/class-map.js'

class GrampsjsFormName extends LitElement {
  static get styles () {
    return [
      sharedStyles,
      css`
      mwc-textfield.fullwidth {
        width: 100%;
      }

      .hide {
        display: none;
      }

      mwc-icon-button {
        color: rgba(0, 0, 0, 0.5);
      }
      `
    ]
  }

  static get properties () {
    return {
      strings: {type: Object},
      data: {type: Object},
      showMore: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.strings = {}
    this.data = {_class: 'Name'}
    this.showMore = false
  }

  render () {
    return html`
    <p class="${classMap({hide: !this.showMore})}">
      <grampsjs-form-string
        @formdata:changed="${this._handleFormData}"
        fullwidth
        id="title"
        label="${this._('Title')}"
      ></grampsjs-form-string>
    </p>
    <p>
      <grampsjs-form-string
        @formdata:changed="${this._handleFormData}"
        fullwidth
        id="first_name"
        label="${this._('Given name')}"
      ></grampsjs-form-string>
    </p>
    <p class="${classMap({hide: !this.showMore})}">
      <grampsjs-form-string
        @formdata:changed="${this._handleFormData}"
        fullwidth
        id="suffix"
        label="${this._('Suffix')}"
      ></grampsjs-form-string>
    </p>
    <p class="${classMap({hide: !this.showMore})}">
    <grampsjs-form-string
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="prefix"
      label="${this._('Prefix')}"
    ></grampsjs-form-string>
    </p>
    <p>
    <grampsjs-form-string
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="surname"
      label="${this._('Surname')}"
    ></grampsjs-form-string>
    </p>
    <p class="${classMap({hide: !this.showMore})}">
    <grampsjs-form-string
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="call"
      label="${this._('Call name')}"
    ></grampsjs-form-string>
    </p>
    <p class="${classMap({hide: !this.showMore})}">
    <grampsjs-form-string
      @formdata:changed="${this._handleFormData}"
      fullwidth
      id="nick"
      label="${this._('Nick name')}"
    ></grampsjs-form-string>
    </p>
    ${this.showMore
    ? ''
    : html`
    <mwc-icon-button
      @click="${this._handleShowMore}"
      icon="more_horiz"
    ></mwc-button>
  `}
    `
  }

  _handleShowMore () {
    this.showMore = true
  }

  reset () {
    this.shadowRoot.querySelectorAll('grampsjs-form-string').forEach(element => element.reset())
    this.showMore = false
  }

  handleChange () {
    fireEvent(this, 'formdata:changed', {data: this.data})
  }

  _ (s) {
    return translate(this.strings, s)
  }

  _handleFormData (e) {
    const originalTarget = e.composedPath()[0]
    if (['first_name', 'call', 'nick', 'title', 'suffix'].includes(originalTarget.id)) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    }
    const surnameList = this.data?.surname_list || []
    const surname = surnameList.length === 0 ? {_class: 'Surname', primary: true} : surnameList[0]
    if (originalTarget.id === 'prefix') {
      this.data = {...this.data, surname_list: [{...surname, prefix: e.detail.data}]}
    }
    if (originalTarget.id === 'surname') {
      this.data = {...this.data, surname_list: [{...surname, surname: e.detail.data}]}
    }
    e.stopPropagation()
    this.handleChange()
  }
}

window.customElements.define('grampsjs-form-name', GrampsjsFormName)
