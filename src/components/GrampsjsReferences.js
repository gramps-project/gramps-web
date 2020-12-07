import { html } from 'lit-element';

import { GrampsjsTableBase } from './GrampsjsTableBase.js';


function capitalize(string) {
  return `${string.charAt(0).toUppercase()}${string.slice(1)}`
}


export class GrampsjsReferences extends GrampsjsTableBase {
  render() {
    return html`
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
    `
  }
}


window.customElements.define('grampsjs-references', GrampsjsReferences);


