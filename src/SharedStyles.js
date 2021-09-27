import {css} from 'lit'

export const sharedStyles = css`
  :host {
    font-size: 18px;
    font-family: Roboto;
    font-weight: 300;
    --mdc-theme-primary: #6D4C41;
    --mdc-theme-on-primary: rgba(255, 255, 255, 0.95);
    --mdc-theme-secondary: #0277bd;
    --mdc-theme-on-secondary: rgba(255, 255, 255, 0.95);
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
    margin-bottom: 30px;
  }

  h3 {
    font-size: 26px;
    margin-top: 30px;
    margin-bottom: 20px;
  }

  h4 {
    font-size: 20px;
  }

  h4.label {
    font-family: Roboto;
    font-size: 18px;
  }

  a:link, a:visited, span.link {
    color: #0D47A1;
    text-decoration: none;
  }

  a:hover, span.link:hover {
    color: #1976D2;
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
  }

  .link {
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

  dt {
    font-size: 14px;
    color: #666;
    font-weight: 400;
    margin-bottom: 0.2em;
  }

  dd {
    margin: 0;
    padding: 0 0 1em 0;
  }

  dl div {
    float: left;
    margin-right: 3rem;
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

  .edit {
    color: var(--mdc-theme-secondary);
    --mdc-theme-primary: var(--mdc-theme-secondary);
    --mdc-theme-on-primary: var(--mdc-theme-on-secondary);
  }
  `
