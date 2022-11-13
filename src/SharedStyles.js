import {css} from 'lit'

export const sharedStyles = css`
  :host {
    --grampsjs-body-font-family: 'Inter var', sans-serif;
    --grampsjs-heading-font-family: 'Roboto Slab', serif;
    font-size: 18px;
    font-family: var(--grampsjs-body-font-family);
    font-weight: 300;
    --mdc-theme-primary: #6d4c41;
    --mdc-theme-on-primary: rgba(255, 255, 255, 0.95);
    --mdc-theme-secondary: #0277bd;
    --mdc-theme-on-secondary: rgba(255, 255, 255, 0.95);
    --mdc-theme-text-primary-on-background: rgba(0, 0, 0, 0.8);
    --mdc-theme-text-secondary-on-background: rgba(0, 0, 0, 0.45);
    --mdc-typography-font-family: var(--grampsjs-body-font-family);
    --color-boy: #64b5f6;
    --color-girl: #ef9a9a;
  }

  mwc-tab-bar {
    --mdc-typography-button-text-transform: none;
    --mdc-typography-button-font-weight: 400;
    --mdc-typography-button-letter-spacing: 0px;
    --mdc-typography-button-font-size: 16px;
    --mdc-tab-text-label-color-default: #6d4c41;
  }

  mwc-tab {
    flex-grow: 0;
  }

  h2,
  h3,
  h4 {
    font-weight: 300;
    font-family: var(--grampsjs-heading-font-family);
  }

  h1 {
    font-weight: 400;
    font-family: var(--grampsjs-heading-font-family);
    font-size: 34px;
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
    font-family: var(--grampsjs-body-font-family);
    font-size: 18px;
  }

  b,
  strong {
    font-weight: 600;
  }

  a:link,
  a:visited,
  span.link {
    color: #0d47a1;
    text-decoration: none;
  }

  a:hover,
  span.link:hover {
    color: #1976d2;
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
  }

  .link {
    cursor: pointer;
  }

  .nopointer {
    pointer-events: none;
  }

  i svg {
    height: 1em;
    top: 0.125em;
    position: relative;
  }

  .md {
    font-weight: 400;
  }

  hr {
    border: 0;
    height: 0.5px;
    background: rgba(0, 0, 0, 0.4);
  }

  dt {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.5);
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

  mwc-list {
    --mdc-list-item-graphic-margin: 16px;
  }

  mwc-list.large {
    --mdc-typography-subtitle1-color: rgba(0, 0, 0, 1);
    --mdc-typography-subtitle1-font-size: 18px;
    --mdc-typography-subtitle1-font-weight: 300;
    --mdc-typography-subtitle1-letter-spacing: -0.01em;
  }

  .avatar.skeleton {
    width: 44px;
    height: 44px;
    border-radius: 22px;
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

  mwc-icon-button.large {
    --mdc-icon-size: 32px;
  }

  h2 .given-name {
    text-decoration: underline rgba(0, 0, 0, 0.6);
    text-underline-offset: 0.15em;
  }

  span.skeleton {
    display: inline-block;
    background: #eee;
    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
    opacity: 0.8;
    border-radius: 3px;
    background-size: 200% 100%;
    animation: 1.5s shine linear infinite;
  }

  @keyframes shine {
    to {
      background-position-x: -200%;
    }
  }

  @media (max-width: 768px) {
    :host {
      font-size: 16px;
    }

    h1 {
      font-size: 24px;
    }

    h2 {
      font-size: 24px;
    }

    h3 {
      font-size: 20px;
    }

    h4 {
      font-size: 18px;
    }
  }
`
