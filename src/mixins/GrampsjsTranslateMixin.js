/*
A mixin for translatable components/views
*/

export const GrampsjsTranslateMixin = (superClass) => class extends superClass {
  static get properties () {
    return {
      strings: {type: Object}
    }
  }

  constructor () {
    super()
    this.strings = {}
  }

  _ (s) {
    if (s === undefined) {
      return ''
    }
    if (s in this.strings) {
      return this.strings[s].replace('_', '')
    }
    return s.replace('_', '')
  }
}
