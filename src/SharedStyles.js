import {css} from 'lit'

export const sharedStyles = css`
  :host {
    line-height: 1.6;
    --grampsjs-body-font-family: 'Inter var', sans-serif;
    --grampsjs-heading-font-family: 'Inter var', sans-serif;
    --md-ref-typeface-plain: 'Inter var', sans-serif;
    --grampsjs-body-font-size: 17px;
    font-size: var(--grampsjs-body-font-size);
    font-family: var(--grampsjs-body-font-family);
    --grampsjs-body-font-weight: 340;
    font-weight: var(--grampsjs-body-font-weight);
    --mdc-typography-font-family: var(--grampsjs-body-font-family);
    --md-sys-typescale-headline-small-font: var(--grampsjs-heading-font-family);
    --md-sys-typescale-headline-medium-font: var(
      --grampsjs-heading-font-family
    );
    --md-sys-typescale-headline-large-font: var(--grampsjs-heading-font-family);
    --md-sys-typescale-body-small-font: var(--grampsjs-body-font-family);
    --md-sys-typescale-body-medium-font: var(--grampsjs-body-font-family);
    --md-sys-typescale-body-large-font: var(--grampsjs-body-font-family);
    --md-primary-tab-label-text-weight: 425;
    --md-primary-tab-label-text-size: 16px;
    --md-primary-tab-active-indicator-height: 3px;
    --md-divider-thickness: 0px;
    --md-list-item-leading-space: 16px;
    --md-list-item-trailing-space: 16px;
    --mdc-list-side-padding: 16px;
  }

  md-list-item {
    --md-list-item-label-text-weight: var(--grampsjs-body-font-weight);
    --md-list-item-label-text-size: 17px;
    --md-list-item-supporting-text-color: var(--grampsjs-body-font-color-50);
    --md-list-item-trailing-supporting-text-color: var(
      --grampsjs-body-font-color
    );
  }

  mwc-dialog {
    --mdc-theme-surface: var(--grampsjs-mwc-dialog-background-color);
  }

  label {
    display: inline-flex;
    place-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 350;
    color: var(--md-sys-color-on-background);
  }

  h2,
  h3,
  h4 {
    font-weight: 500;
    font-family: var(--grampsjs-heading-font-family);
    color: var(--grampsjs-color-shade-40);
  }

  h1 {
    font-weight: 400;
    font-family: var(--grampsjs-heading-font-family);
    font-size: 34px;
  }

  h2 {
    font-weight: 550;
    font-size: 30px;
    margin-top: 10px;
    margin-bottom: 30px;
  }

  h3 {
    font-weight: 470;
    font-size: 18px;
    margin-top: 35px;
    margin-bottom: 30px;
  }

  h4 {
    font-size: 16px;
  }

  h4.label {
    font-family: var(--grampsjs-body-font-family);
    font-size: 16px;
  }

  b,
  strong {
    font-weight: 600;
  }

  a:link,
  a:visited,
  span.link {
    color: var(--grampsjs-color-link-font);
    text-decoration: none;
  }

  a:hover,
  span.link:hover {
    color: var(--grampsjs-color-link-hover);
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
    background: var(--grampsjs-body-font-color-40);
  }

  dt {
    font-size: 14px;
    color: var(--grampsjs-body-font-color-50);
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
    color: var(--grampsjs-body-font-color-20);
    font-size: 1.05em;
    position: relative;
    top: 0.15em;
  }

  mwc-list {
    --mdc-list-item-graphic-margin: 16px;
  }

  mwc-list.large {
    --mdc-typography-subtitle1-color: var(--grampsjs-body-font-color-100);
    --mdc-typography-subtitle1-font-size: var(--grampsjs-body-font-size);
    --mdc-typography-subtitle1-font-weight: var(--grampsjs-body-font-weight);
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
    color: var(--grampsjs-body-font-color-35);
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
    fill: var(--grampsjs-body-font-color-40);
  }

  .event i svg {
    height: 16px;
    width: auto;
  }

  .edit {
    color: var(--mdc-theme-secondary);
    --mdc-theme-primary: var(--mdc-theme-secondary);
    --mdc-theme-on-primary: var(--mdc-theme-on-secondary);
    --md-sys-color-primary: var(--md-sys-color-secondary);
    --md-sys-color-on-primary: var(--md-sys-color-on-secondary);
    --md-sys-color-primary-container: var(--md-sys-color-secondary-container);
    --md-sys-color-on-primary-container: var(
      --md-sys-color-on-secondary-container
    );
  }

  mwc-icon-button.large {
    --mdc-icon-size: 32px;
  }

  h2 .given-name {
    text-decoration: underline var(--grampsjs-body-font-color-60);
    text-underline-offset: 0.15em;
    text-decoration-thickness: 0.1rem;
  }

  span.skeleton {
    display: inline-block;
    background-color: var(--grampsjs-color-skeleton-background);
    background: linear-gradient(
      110deg,
      var(--grampsjs-color-skeleton-base) 8%,
      var(--grampsjs-color-skeleton-shine) 18%,
      var(--grampsjs-color-skeleton-base) 33%
    );
    opacity: 0.8;
    border-radius: 3px;
    background-size: 200% 100%;
    animation: 1.5s shine linear infinite;
  }

  div.skeleton {
    background-color: var(--grampsjs-color-skeleton-background);
    background: linear-gradient(
      110deg,
      var(--grampsjs-color-skeleton-base) 8%,
      var(--grampsjs-color-skeleton-shine) 18%,
      var(--grampsjs-color-skeleton-base) 33%
    );
    opacity: 0.8;
    background-size: 200% 100%;
    animation: 1.5s shine linear infinite;
  }

  .alert {
    background-color: var(--grampsjs-alert-background-color);
    border-left: 4px solid var(--grampsjs-alert-border-color);
    border-radius: 5px;
    padding: 0.8em 1em;
    font-size: 0.8em;
    color: var(--grampsjs-body-font-color);
    margin: 1.5em 0;
  }

  .alert.error {
    background-color: var(--grampsjs-alert-error-background-color);
    border-left-color: var(--grampsjs-alert-error-border-color);
  }

  .alert.warn {
    background-color: var(--grampsjs-alert-warn-background-color);
    border-left-color: var(--grampsjs-alert-warn-border-color);
  }

  .success {
    color: var(--grampsjs-alert-success-font-color);
  }

  .error {
    color: var(--grampsjs-alert-error-font-color);
  }

  .warn {
    color: var(--grampsjs-alert-warn-font-color);
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
    background-color: var(--grampsjs-editable-title-hover-background-color);
  }

  .monospace {
    font-family: 'Commit Mono';
    border: 1px solid var(--grampsjs-body-font-color-15);
    border-radius: 5px;
    background-color: var(--grampsjs-body-font-color-5);
    padding: 0.3em;
    font-size: 0.9em;
    color: var(--grampsjs-color-monospace);
  }

  md-outlined-text-field.drag-hover {
    --md-outlined-text-field-outline-color: var(--mdc-theme-secondary);
    --md-outlined-text-field-hover-outline-color: var(--mdc-theme-secondary);
    --md-outlined-text-field-hover-outline-width: var(--mdc-theme-secondary);
    --md-outlined-text-field-outline-width: var(--mdc-theme-secondary);
    --md-outlined-text-field-input-text-color: var(
      --grampsjs-body-font-color-50
    );
    --md-outlined-text-field-hover-input-text-color: var(
      --grampsjs-body-font-color-40
    );
  }

  @media (max-width: 768px) {
    :host {
      font-size: 16px;
      --md-list-item-leading-space: 8px;
      --md-list-item-trailing-space: 8px;
      --mdc-list-side-padding: 8px;
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

  mwc-icon-button[slot='meta'] {
    color: var(--grampsjs-color-icon-default);
  }
`
