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
    let t = s
    if (s in this.strings) {
      t = this.strings[s]
    }
    t = t.replace('_', '')
    for (let i = 1; i < arguments.length; i++) {
      t = t.replace('%s', arguments[i])
    }
    return t
  }
}
