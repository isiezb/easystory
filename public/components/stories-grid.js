import { LitElement, html, css } from 'lit';
import './story-card.js';

export class StoriesGrid extends LitElement {
  static properties = {
    stories: { type: Array },
    loading: { type: Boolean, reflect: true },
    columns: { type: Number }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(var(--grid-columns, 3), 1fr);
      gap: 1.5rem;
      width: 100%;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: var(--card-bg, white);
      border-radius: 12px;
      border: 1px dashed var(--border, rgba(0, 0, 0, 0.1));
      color: var(--text-secondary, #6c757d);
      font-size: 1.1rem;
      grid-column: 1 / -1;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        var(--gray-200, #e9ecef) 25%,
        var(--gray-300, #dee2e6) 50%,
        var(--gray-200, #e9ecef) 75%
      );
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 12px;
      height: 300px;
    }

    @keyframes loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @media (max-width: 1024px) {
      .grid {
        --grid-columns: 2;
      }
    }

    @media (max-width: 640px) {
      .grid {
        --grid-columns: 1;
      }
    }
  `;

  constructor() {
    super();
    this.stories = [];
    this.loading = false;
    this.columns = 3;
  }

  updated(changedProperties) {
    if (changedProperties.has('columns')) {
      this.style.setProperty('--grid-columns', this.columns.toString());
    }
  }

  _handleViewStory(e) {
    const { storyId } = e.detail;
    this.dispatchEvent(new CustomEvent('view-story', {
      detail: { storyId },
      bubbles: true,
      composed: true
    }));
  }

  _handleDeleteStory(e) {
    const { storyId } = e.detail;
    this.dispatchEvent(new CustomEvent('delete-story', {
      detail: { storyId },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (this.loading) {
      return html`
        <div class="grid">
          ${Array(this.columns).fill(0).map(() => html`<div class="skeleton"></div>`)}
        </div>
      `;
    }

    if (!this.stories || this.stories.length === 0) {
      return html`
        <div class="grid">
          <div class="empty-state">
            No stories yet. Generate your first story!
          </div>
        </div>
      `;
    }

    return html`
      <div class="grid">
        ${this.stories.map(story => html`
          <story-card 
            .story=${story} 
            @view-story=${this._handleViewStory}
            @delete-story=${this._handleDeleteStory}
          ></story-card>
        `)}
      </div>
    `;
  }
}

customElements.define('stories-grid', StoriesGrid); 