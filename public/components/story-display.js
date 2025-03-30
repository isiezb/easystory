import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('story-display')
export class StoryDisplay extends LitElement {
  @property({ type: Object }) 
  story = null;

  @property({ type: Boolean }) 
  showControls = true;
  
  @state() 
  _isCopied = false;

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
    }
    
    .story__content {
      background: var(--card-bg, white);
      border-radius: 24px;
      padding: 2rem;
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
      margin-bottom: 2rem;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
    }
    
    .story__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .story__title {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-weight: 700;
      font-size: 2rem;
      margin: 0;
      color: var(--text, #212529);
      line-height: 1.2;
    }
    
    .story__summary {
      background: var(--gray-100, #f1f3f5);
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }
    
    .story__summary-title {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-weight: 600;
      font-size: 1.25rem;
      margin: 0 0 0.75rem;
      color: var(--primary, #5e7ce6);
    }
    
    .story__summary-content {
      line-height: 1.6;
      color: var(--text-secondary, #6c757d);
    }
    
    .story__meta {
      background: rgba(94, 124, 230, 0.05);
      border: 1px solid rgba(94, 124, 230, 0.1);
      padding: 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }
    
    .story__learning-objectives h4 {
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-weight: 600;
      margin: 0 0 0.75rem;
      color: var(--text, #212529);
    }
    
    .story__learning-objectives ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    .story__learning-objectives li {
      margin-bottom: 0.5rem;
      color: var(--text-secondary, #6c757d);
    }
    
    .story__text {
      line-height: 1.8;
      margin-bottom: 1.5rem;
      color: var(--text, #212529);
    }
    
    .story__paragraph-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    
    .story__paragraph {
      flex: 1;
      margin: 0;
    }
    
    .story__tts-btn {
      background: none;
      border: none;
      color: var(--text-secondary, #6c757d);
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
      padding: 0.25rem;
      margin-left: 0.5rem;
      margin-top: 0.2rem;
      border-radius: 50%;
    }
    
    .story__tts-btn:hover {
      opacity: 1;
      background: var(--gray-100, #f1f3f5);
    }
    
    .story__tts-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .story__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .story__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.25rem;
      background: var(--bg, #f8f9fa);
      border: 2px solid var(--border, rgba(0, 0, 0, 0.1));
      border-radius: 10px;
      font-family: var(--font-heading, 'Inter', sans-serif);
      font-weight: 500;
      font-size: 1rem;
      color: var(--text, #212529);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .story__action-btn:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
      border-color: var(--primary, #5e7ce6);
    }
    
    .story__action-btn--active {
      background: var(--primary, #5e7ce6);
      color: white;
      border-color: var(--primary, #5e7ce6);
    }
    
    @media (max-width: 768px) {
      .story__content {
        padding: 1.5rem;
      }
      
      .story__title {
        font-size: 1.75rem;
      }
      
      .story__actions {
        flex-direction: column;
      }
    }
  `;

  _sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async _handleCopy() {
    try {
      const storyText = this.renderRoot.querySelector('.story__text').textContent;
      await navigator.clipboard.writeText(storyText);
      this._isCopied = true;
      
      // Reset copy button after 2 seconds
      setTimeout(() => {
        this._isCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      this.dispatchEvent(new CustomEvent('error', { 
        detail: { message: 'Failed to copy text to clipboard' } 
      }));
    }
  }

  _handlePrint() {
    window.print();
  }

  _handleSave() {
    this.dispatchEvent(new CustomEvent('save-story', { 
      detail: { story: this.story } 
    }));
  }

  _handleTextToSpeech(text) {
    this.dispatchEvent(new CustomEvent('tts', { 
      detail: { text } 
    }));
  }

  render() {
    if (!this.story || !this.story.title || !this.story.content) {
      return html`<div class="story-error">No valid story data available</div>`;
    }

    return html`
      <div class="story__content">
        <div class="story__header">
          <h2 class="story__title">${this.story.title}</h2>
          <button id="tts-button" 
                  class="story__tts-btn" 
                  aria-label="Text to Speech" 
                  ?disabled=${!window.speechSynthesis}
                  @click=${() => this._handleTextToSpeech(this.story.content)}>
            <span class="story__tts-icon">🔊</span>
          </button>
        </div>

        ${this.story.summary ? html`
          <div class="story__summary">
            <div class="story__summary-title">Story Summary</div>
            <div class="story__summary-content">${this.story.summary}</div>
          </div>
        ` : ''}

        <div class="story__meta">
          <div class="story__learning-objectives">
            <h4>Learning Objectives:</h4>
            <ul>
              ${(this.story.learning_objectives || []).map(obj => html`
                <li>${obj}</li>
              `)}
            </ul>
          </div>
        </div>

        <div class="story__text">
          ${this.story.content.split('\n').map(paragraph => html`
            <div class="story__paragraph-container">
              <p class="story__paragraph">${paragraph}</p>
              <button class="story__tts-btn story__tts-btn--paragraph" 
                      aria-label="Read paragraph" 
                      ?disabled=${!window.speechSynthesis}
                      @click=${() => this._handleTextToSpeech(paragraph)}>
                <span class="story__tts-icon">🔊</span>
              </button>
            </div>
          `)}
        </div>

        ${this.showControls ? html`
          <div class="story__actions">
            <button class="story__action-btn story__action-btn--copy ${this._isCopied ? 'story__action-btn--active' : ''}"
                    @click=${this._handleCopy}>
              <span>${this._isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button class="story__action-btn story__action-btn--save"
                    @click=${this._handleSave}>
              <span>Save</span>
            </button>
            <button class="story__action-btn story__action-btn--print"
                    @click=${this._handlePrint}>
              <span>Print</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
} 