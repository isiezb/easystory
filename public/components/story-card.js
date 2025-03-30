import { LitElement, html, css } from 'lit';

export class StoryCard extends LitElement {
  static properties = {
    story: { type: Object },
    compact: { type: Boolean, reflect: true }
  };

  static styles = css`
    :host {
      display: block;
      background: var(--card-bg, white);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
      transition: all 0.3s ease;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      height: 100%;
    }

    :host(:hover) {
      transform: translateY(-5px);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
    }

    .story-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    h3 {
      font-family: var(--font-heading, sans-serif);
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
      color: var(--text, #212529);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .story-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: var(--text-secondary, #6c757d);
    }

    .story-subject {
      background: var(--primary-100, #dde4ff);
      color: var(--primary-600, #4a63b9);
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-weight: 500;
      font-size: 0.8rem;
      display: inline-block;
    }

    .story-preview {
      color: var(--text-secondary, #6c757d);
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
      flex-grow: 1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    :host([compact]) .story-preview {
      -webkit-line-clamp: 2;
    }

    .story-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: auto;
    }

    button {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-family: var(--font-heading, sans-serif);
      font-weight: 500;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-story {
      background: var(--primary, #5e7ce6);
      color: white;
    }

    .view-story:hover {
      background: var(--primary-600, #4a63b9);
    }

    .delete-story {
      background: var(--gray-100, #f1f3f5);
      color: var(--gray-700, #495057);
    }

    .delete-story:hover {
      background: var(--gray-200, #e9ecef);
      color: var(--error, #f56565);
    }
  `;

  constructor() {
    super();
    this.story = {};
    this.compact = false;
  }

  _formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  }

  _truncateText(text, length = 150) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  _handleViewClick() {
    this.dispatchEvent(new CustomEvent('view-story', {
      detail: { storyId: this.story.id },
      bubbles: true,
      composed: true
    }));
  }

  _handleDeleteClick() {
    this.dispatchEvent(new CustomEvent('delete-story', {
      detail: { storyId: this.story.id },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.story || !this.story.id) {
      return html`<div>No story data</div>`;
    }

    return html`
      <div class="story-card">
        <h3>${this.story.story_title}</h3>
        <div class="story-meta">
          <span class="story-subject">${this.story.subject}</span>
          <span class="story-date">${this._formatDate(this.story.created_at)}</span>
        </div>
        <div class="story-preview">${this._truncateText(this.story.story_text)}</div>
        <div class="story-actions">
          <button class="view-story" @click=${this._handleViewClick}>View Story</button>
          <button class="delete-story" @click=${this._handleDeleteClick}>Delete</button>
        </div>
      </div>
    `;
  }
}

customElements.define('story-card', StoryCard); 