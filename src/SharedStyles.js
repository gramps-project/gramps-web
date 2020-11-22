import { css } from 'lit-element';

export const sharedStyles = css`
  :host {
    font-size: 20px;
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
}


mwc-tab {
  flex-grow: 0;
}

`;
