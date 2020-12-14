import {css} from 'lit-element'

export const sharedStyles = css`
  :host {
    font-size: 18px;
    font-family: Roboto;
    font-weight: 300;
    --mdc-theme-primary: #6D4C41;
    --mdc-theme-on-primary: #EFEBE9;
    --mdc-typography-font-family: Roboto;
    --color-boy: #64B5F6;
    --color-girl: #EF9A9A;
  }

  mwc-tab-bar {
    --mdc-typography-button-text-transform: none;
    --mdc-typography-button-font-weight: 400;
    --mdc-typography-button-letter-spacing: 0px;
    --mdc-typography-button-font-size: 16px;
    --mdc-tab-text-label-color-default: #6D4C41;
  }


  mwc-tab {
    flex-grow: 0;
  }

  h2, h3, h4 {
    font-weight: 300;
    font-family: Roboto Slab;
  }

  h2 {
    font-size: 32px;
    margin-top: 10px;
    margin-bottom: 20px;
  }

  h3 {
    font-size: 26px;
    margin-top: 30px;
    margin-bottom: 20px;
  }

  a:link, a:visited, span.link {
    color: #1976D2;
    text-decoration: none;
  }

  a:hover, span.link:hover {
    color: #64B5F6;
    text-decoration: underline;
  }

  span.link {
    cursor: pointer;
  }

  i svg {
    height: 1em;
    top: .125em;
    position: relative;
  }

  .md {
    font-weight: 400;
  }

  p {
    margin-top: 1.2em;
    margin-bottom: 1.2em;
  }

  h2 mwc-icon {
    color: rgba(0, 0, 0, 0.2);
    font-size: 1.05em;
    position: relative;
    top: 0.15em;
  }

  .float-right {
    float: right;
  }

  mwc-icon.inline {
    vertical-align: middle;
    size: 0.8em;
    padding-right: 0.2em;
    position: relative;
    bottom: auto;
    top: auto;
    color: rgba(0, 0, 0, 0.35);
  }

  mwc-icon.male {
    color: var(--color-boy);
  }

  mwc-icon.female {
    color: var(--color-girl);
  }

  .event {
    margin-right: 1em;
  }

  .event i svg path {
    fill: #999999;
  }

  .event i svg {
    height: 16px;
    width: auto;
  }

  `
