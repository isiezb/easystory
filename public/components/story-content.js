import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('story-content')
export class StoryContent extends LitElement {
  @property({ type: Object })
  story = {
    title: '',
    content: '',
    summary: null,
    vocabulary: null,
    learning_objectives: null,
    saved: null,
    save_error: null
  };

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
    }

    .story-container {
      background: var(--card-bg, white);
      border-radius: 20px;
      padding: 2.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      line-height: 1.8;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .story-container:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
    }

    .story-title {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-size: 2.25rem;
      color: var(--primary, #5e7ce6);
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }

    .story-text {
      margin-bottom: 2rem;
    }

    .story-text p {
      margin-bottom: 1.25rem;
      text-align: justify;
      color: var(--text, #212529);
      font-size: 1.1rem;
      line-height: 1.8;
    }

    .story-text p:first-of-type {
      font-size: 1.2rem;
      line-height: 1.7;
      font-weight: 500;
    }

    .save-status {
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      font-weight: 500;
    }

    .save-status.success {
      background-color: rgba(104, 211, 145, 0.1);
      border: 1px solid var(--success, #68d391);
      color: var(--success, #68d391);
    }

    .save-status.error {
      background-color: rgba(245, 101, 101, 0.1);
      border: 1px solid var(--error, #f56565);
      color: var(--error, #f56565);
    }

    h3 {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-size: 1.5rem;
      color: var(--primary, #5e7ce6);
      margin: 2rem 0 1rem;
    }

    .story-summary, 
    .learning-objectives, 
    .vocabulary-section {
      margin-top: 2rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border, rgba(0, 0, 0, 0.1));
    }

    .story-summary p {
      line-height: 1.7;
    }

    ul {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.5rem;
      line-height: 1.6;
    }

    .vocabulary-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .vocabulary-item {
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 8px;
      padding: 1rem;
      background: var(--bg, #f8f9fa);
      transition: all 0.2s ease;
    }

    .vocabulary-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
      border-color: var(--primary, #5e7ce6);
    }

    .vocabulary-word {
      font-weight: 600;
      font-family: var(--font-heading, 'Inter', sans-serif);
      color: var(--primary, #5e7ce6);
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .vocabulary-definition {
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--text, #212529);
    }

    @media (max-width: 768px) {
      .story-container {
        padding: 1.5rem;
      }

      .story-title {
        font-size: 1.75rem;
      }

      .story-text p {
        font-size: 1rem;
      }

      .vocabulary-list {
        grid-template-columns: 1fr;
      }
    }
  `;

  render() {
    // Destructure story properties with defaults
    const { 
      title = '', 
      content = 'Content could not be retrieved.', 
      summary = null, 
      vocabulary = null, 
      learning_objectives = null,
      saved = null,
      save_error = null
    } = this.story;

    return html`
      <div class="story-container">
        ${title && title !== 'Generated Story' ? html`
          <h2 class="story-title">${title}</h2>
        ` : ''}
        
        <div class="story-text">
          ${content.split('\n').map(p => p ? html`<p>${p}</p>` : '')}
        </div>
        
        ${saved === true ? html`
          <div class="save-status success">
            <p>✅ Story saved successfully</p>
          </div>
        ` : ''}
        
        ${saved === false ? html`
          <div class="save-status error">
            <p>⚠️ Story was not saved: ${save_error || 'Unknown error'}</p>
          </div>
        ` : ''}
        
        ${summary ? html`
          <div class="story-summary">
            <h3>Story Summary</h3>
            <p>${summary}</p>
          </div>
        ` : ''}
        
        ${learning_objectives && Array.isArray(learning_objectives) && learning_objectives.length > 0 ? html`
          <div class="learning-objectives">
            <h3>Learning Objectives</h3>
            <ul>
              ${learning_objectives.map(obj => html`<li>${obj}</li>`)}
            </ul>
          </div>
        ` : ''}
        
        ${vocabulary && Array.isArray(vocabulary) && vocabulary.length > 0 ? html`
          <div class="vocabulary-section">
            <h3>Vocabulary</h3>
            <div class="vocabulary-list">
              ${vocabulary.map(item => html`
                <div class="vocabulary-item">
                  <div class="vocabulary-word">${item.word}</div>
                  <div class="vocabulary-definition">${item.definition}</div>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
} 