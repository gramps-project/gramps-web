// The Material form controls call attachInternals() in their constructor,
// which happy-dom does not implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {setFormValue() {}, setValidity() {}}
  }
}

// Browsers tag custom elements as [object HTMLElement]; happy-dom uses the
// class name, so tippy.js mistakes a custom element target for a selector.
Object.defineProperty(HTMLElement.prototype, Symbol.toStringTag, {
  configurable: true,
  get() {
    return customElements.getName(this.constructor)
      ? 'HTMLElement'
      : this.constructor.name
  },
})
