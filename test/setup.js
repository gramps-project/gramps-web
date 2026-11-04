// The Material form controls call attachInternals() in their constructor,
// which happy-dom does not implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {setFormValue() {}, setValidity() {}}
  }
}
