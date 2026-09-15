import {sexColor} from '../util.js'

// Colours of chart content. The values are CSS variables, so charts follow
// the app theme.
export const chartPalette = {
  sex: sexColor,
  personBox: 'var(--grampsjs-color-shade-230)',
  text: 'var(--grampsjs-body-font-color-90)',
  link: 'var(--grampsjs-body-font-color-70)',
  relationshipLink: 'var(--grampsjs-body-font-color-40)',
  familyMarker: 'var(--grampsjs-body-font-color-40)',
  familyMarkerFill: 'var(--grampsjs-color-shade-220)',
  triangle: 'var(--grampsjs-body-font-color-35)',
  triangleHover: 'var(--grampsjs-body-font-color-10)',
  shadow: 'var(--grampsjs-body-font-color-30)',
  addButton: 'var(--mdc-theme-secondary, #0277bd)',
  addButtonIcon: '#ffffff',
}
