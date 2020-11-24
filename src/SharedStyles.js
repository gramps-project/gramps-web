import { css } from 'lit-element';

export const sharedStyles = css`
  :host {
    font-size: 18px;
    font-family: Roboto;
    font-weight: 300;
    --mdc-theme-primary: #6D4C41;
    --mdc-theme-on-primary: #EFEBE9;
    --mdc-typography-font-family: Roboto;
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

  h2 {
    font-weight: 300;
    font-size: 32px;
    font-family: Roboto Slab;
    margin-top: 10px;
    margin-bottom: 10px;
  }

  a:link, a:visited {
    color: #1976D2;
    text-decoration: none;
  }

  a:hover {
    color: #64B5F6;
    text-decoration: underline;
  }
`;
