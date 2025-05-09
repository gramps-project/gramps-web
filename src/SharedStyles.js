import {css} from 'lit'

export const sharedStyles = css`
  :host {
    --grampsjs-body-font-family: 'Inter var', sans-serif;
    --grampsjs-heading-font-family: 'Roboto Slab', serif;
    --md-ref-typeface-plain: 'Inter var', sans-serif;
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
    --md-sys-color-primary: rgb(109 76 65);
    --md-sys-color-surface-tint: rgb(109 76 65);
    --md-sys-color-on-primary: rgb(255 255 255);
    --md-sys-color-primary-container: rgb(255 219 207);
    --md-sys-color-on-primary-container: rgb(57 12 0);
    --md-sys-color-secondary: rgb(49 98 141);
    --md-sys-color-on-secondary: rgb(255 255 255);
    --md-sys-color-secondary-container: rgb(207 229 255);
    --md-sys-color-on-secondary-container: rgb(0 29 52);
    --md-sys-color-tertiary: rgb(106 94 47);
    --md-sys-color-on-tertiary: rgb(255 255 255);
    --md-sys-color-tertiary-container: rgb(243 226 167);
    --md-sys-color-on-tertiary-container: rgb(34 27 0);
    --md-sys-color-error: rgb(186 26 26);
    --md-sys-color-on-error: rgb(255 255 255);
    --md-sys-color-error-container: rgb(255 218 214);
    --md-sys-color-on-error-container: rgb(65 0 2);
    --md-sys-color-background: rgb(255 248 246);
    --md-sys-color-on-background: rgb(35 25 23);
    --md-sys-color-surface: #fff;
    --md-sys-color-on-surface: rgb(35 25 23);
    --md-sys-color-surface-variant: rgb(245 222 215);
    --md-sys-color-on-surface-variant: rgb(83 67 63);
    --md-sys-color-outline: rgb(133 115 110);
    --md-sys-color-outline-variant: rgb(216 194 187);
    --md-sys-color-shadow: rgb(0 0 0);
    --md-sys-color-scrim: rgb(0 0 0);
    --md-sys-color-inverse-surface: rgb(57 46 43);
    --md-sys-color-inverse-on-surface: rgb(255 237 232);
    --md-sys-color-inverse-primary: rgb(255 181 156);
    --md-sys-color-primary-fixed: rgb(255 219 207);
    --md-sys-color-on-primary-fixed: rgb(57 12 0);
    --md-sys-color-primary-fixed-dim: rgb(255 181 156);
    --md-sys-color-on-primary-fixed-variant: rgb(114 53 32);
    --md-sys-color-secondary-fixed: rgb(207 229 255);
    --md-sys-color-on-secondary-fixed: rgb(0 29 52);
    --md-sys-color-secondary-fixed-dim: rgb(157 203 251);
    --md-sys-color-on-secondary-fixed-variant: rgb(18 74 115);
    --md-sys-color-tertiary-fixed: rgb(243 226 167);
    --md-sys-color-on-tertiary-fixed: rgb(34 27 0);
    --md-sys-color-tertiary-fixed-dim: rgb(214 198 141);
    --md-sys-color-on-tertiary-fixed-variant: rgb(81 70 26);
    --md-sys-color-surface-dim: rgb(232 214 209);
    --md-sys-color-surface-bright: rgb(255 248 246);
    --md-sys-color-surface-container-lowest: rgb(255 255 255);
    --md-sys-color-surface-container-low: rgb(255 241 237);
    --md-sys-color-surface-container: #fff;
    --md-sys-color-surface-container-high: #fff;
    --md-sys-color-surface-container-highest: #fff;
    --md-primary-tab-label-text-weight: 425;
    --md-primary-tab-label-text-size: 16px;
    --md-primary-tab-active-indicator-height: 3px;
    --md-divider-thickness: 0px;
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

  label {
    display: inline-flex;
    place-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 350;
    color: var(--md-sys-color-on-background, #000);
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
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
  }

  .link {
    cursor: pointer;
  }

  .linkicon {
    --md-icon-size: 15px;
    margin-right: 8px;
    position: relative;
    bottom: -1px;
    opacity: 0.7;
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
    text-decoration-thickness: 0.1rem;
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

  div.skeleton {
    background: #eee;
    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
    opacity: 0.8;
    background-size: 200% 100%;
    animation: 1.5s shine linear infinite;
  }

  .alert {
    background-color: rgba(109, 76, 65, 0.15);
    border-left: 4px solid rgba(109, 76, 65, 0.7);
    border-radius: 5px;
    padding: 0.8em 1em;
    font-size: 0.8em;
    color: rgba(0, 0, 0, 0.8);
    margin: 1.5em 0;
  }

  .alert.error {
    color: #bf360c;
    background-color: rgba(191, 54, 12, 0.2);
    border-left-color: rgba(191, 54, 12, 0.7);
  }

  .alert.warn {
    color: rgba(0, 0, 0, 0.5);
    background-color: rgba(251, 192, 45, 0.2);
    border-left-color: rgba(251, 192, 45, 0.7);
  }

  .success {
    color: #41ad49;
  }

  .error {
    color: #bf360c;
  }

  .warn {
    color: #f9a825;
  }

  @keyframes shine {
    to {
      background-position-x: -200%;
    }
  }

  grampsjs-task-progress-indicator.button {
    position: relative;
    top: 6px;
    left: 10px;
  }

  grampsjs-task-progress-indicator.button-left {
    position: relative;
    top: 6px;
    right: 10px;
  }

  h2.editable:hover {
    background-color: rgba(2, 119, 189, 0.2);
  }

  .monospace {
    font-family: 'Commit Mono';
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 5px;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.3em;
    font-size: 0.9em;
    color: rgb(125, 0, 0, 0.8);
  }

  md-outlined-text-field.drag-hover {
    --md-outlined-text-field-outline-color: var(--mdc-theme-secondary);
    --md-outlined-text-field-hover-outline-color: var(--mdc-theme-secondary);
    --md-outlined-text-field-hover-outline-width: var(--mdc-theme-secondary);
    --md-outlined-text-field-outline-width: var(--mdc-theme-secondary);
    --md-outlined-text-field-input-text-color: rgba(0, 0, 0, 0.5);
    --md-outlined-text-field-hover-input-text-color: rgba(0, 0, 0, 0.4);
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
