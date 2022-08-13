import { html, css } from 'lit';

import { GrampsjsConnectedComponent } from '../components/GrampsjsConnectedComponent.js';
import '../components/GrampsjsSearchResults.js';
import '../components/GrampsjsTimedelta';

const BASE_DIR = '';

export class GrampsjsViewRecentBlogPosts extends GrampsjsConnectedComponent {
  static get styles() {
    return [
      super.styles,
      css`
        .change {
          font-size: 0.8em;
          color: rgba(0, 0, 0, 0.5);
          margin-top: 0.3em;
        }
      `,
    ];
  }

  renderContent() {
    if (!this._data?.data?.length) {
      return html`
        <h2>${this._('Latest Blog Post')}</h2>
        <p>${this._('No items')}.</p>
      `;
    }
    return html`
      <h2>${this._('Latest Blog Post')}</h2>
      ${this._data.data.slice(0, 1).map(obj => this._renderPost(obj))}
    `;
  }

  renderLoading() {
    return html`
      <h2>${this._('Latest Blog Post')}</h2>
      <span class="skeleton" style="width:7em;">&nbsp;</span><br />
      <div class="change">
        <span class="skeleton" style="width:7em;">&nbsp;</span>
      </div>
    `;
  }

  _renderPost(obj) {
    return html`
      <a href="${BASE_DIR}/blog/">${obj.title}</a><br />
      <div class="change">
        <grampsjs-timedelta
          timestamp="${obj.change}"
          locale="${this.strings.__lang__}"
        ></grampsjs-timedelta>
      </div>
    `;
  }

  getUrl() {
    const rules = {
      rules: [
        {
          name: 'HasTag',
          values: ['Blog'],
        },
      ],
    };
    return `/api/sources/?rules=${encodeURIComponent(
      JSON.stringify(rules)
    )}&pagesize=1&sort=-change&locale=${
      this.strings.__lang__ || 'en'
    }&profile=all&extend=all`;
  }
}

window.customElements.define(
  'grampsjs-view-recent-blog-posts',
  GrampsjsViewRecentBlogPosts
);
