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
  fanRoot: 'var(--grampsjs-color-shade-120)',
  fanNoValue: 'var(--grampsjs-color-shade-220)',
  fanText: 'var(--grampsjs-body-font-color-70)',
  legendText: 'var(--grampsjs-body-font-color)',
}

// Colours of exported charts: the light theme as opaque colours on a white
// background, so a saved file looks the same in any app and theme
export const exportPalette = {
  sex: {F: '#ef9a9a', M: '#64b5f6', X: '#ce93d8', U: '#b0bec5'},
  background: '#ffffff',
  personBox: '#e6e6e6',
  text: '#1a1a1a',
  link: '#4d4d4d',
  relationshipLink: '#999999',
  familyMarker: '#999999',
  familyMarkerFill: '#dcdcdc',
  triangle: '#a6a6a6',
  triangleHover: '#e6e6e6',
  shadow: '#b3b3b3',
  addButton: '#0277bd',
  addButtonIcon: '#ffffff',
  fanRoot: '#787878',
  fanNoValue: '#dcdcdc',
  fanText: '#4d4d4d',
  legendText: '#333333',
}
