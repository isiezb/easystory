import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class StoryDisplay extends LitElement {
  static get properties() {
    return {
      story: { type: Object },
      showControls: { type: Boolean }
    };
  }
  
  constructor() {
    super();
    this.story = null;
    this.showControls = true;
    this._isCopied = false;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--font-body, 'Source Serif Pro', Georgia, 'Times New Roman', serif);
      }

      .story-display {
        position: relative;
        background: var(--card-bg, white);
        border-radius: 24px;
        padding: 3rem;
        box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
        border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
        transition: var(--transition-normal, all 0.3s ease);
        animation: fadeIn 0.5s ease-in-out;
      }

      .story-display:hover {
        box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
      }

      .story-content {
        font-size: 1.125rem;
        line-height: 1.8;
        color: var(--text, #212529);
      }

      .story-content p {
        margin-bottom: 1.5rem;
      }

      .story-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border, rgba(0, 0, 0, 0.1));
      }

      .control-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border: none;
        border-radius: 8px;
        background: var(--bg, #f8f9fa);
        color: var(--text-secondary, #6c757d);
        font-family: var(--font-heading, 'Inter', sans-serif);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
      }

      .control-button:hover {
        background: var(--primary-50, #eef2ff);
        color: var(--primary, #5e7ce6);
        transform: translateY(-1px);
      }

      .control-button svg {
        width: 1rem;
        height: 1rem;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 768px) {
        .story-display {
          padding: 2rem;
        }

        .story-controls {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    `;
  }

  _sanitizeText(text) {
    // Basic sanitization function that preserves paragraphs
    return text ? text.split('\n\n').map(p => p.trim()).filter(Boolean) : [];
  }

  async _handleCopy() {
    if (this.story && this.story.content) {
      try {
        await navigator.clipboard.writeText(this.story.content);
        this._isCopied = true;
        
        setTimeout(() => {
          this._isCopied = false;
          this.requestUpdate();
        }, 2000);
        
        this.requestUpdate();
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  }

  _handlePrint() {
    if (this.story && this.story.content) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${this.story.title || 'Story'}</title>
            <style>
              body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.8; padding: 2rem; }
              h1 { margin-bottom: 2rem; }
              p { margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <h1>${this.story.title || 'Story'}</h1>
            ${this._sanitizeText(this.story.content).map(p => `<p>${p}</p>`).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  _handleSave() {
    if (this.story && this.story.content) {
      const blob = new Blob([this.story.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.story.title || 'story'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  _handleTextToSpeech(text) {
    if (window.speechSynthesis && text) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create a new speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set properties (optional)
      utterance.rate = 0.9; // slightly slower than default
      utterance.pitch = 1;
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
    }
  }

  render() {
    if (!this.story) return html`<div class="story-display"></div>`;

    const paragraphs = this._sanitizeText(this.story.content);

    return html`
      <div class="story-display">
        <div class="story-content">
          ${paragraphs.map(p => html`<p>${p}</p>`)}
        </div>
        
        ${this.showControls ? html`
          <div class="story-controls">
            <button @click=${this._handleCopy} class="control-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              ${this._isCopied ? 'Copied!' : 'Copy'}
            </button>
            
            <button @click=${this._handlePrint} class="control-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9V2h12v7"></path>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <path d="M6 14h12v8H6z"></path>
              </svg>
              Print
            </button>
            
            <button @click=${this._handleSave} class="control-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Save
            </button>
            
            <button @click=${() => this._handleTextToSpeech(this.story.content)} class="control-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
              Read Aloud
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('story-display', StoryDisplay); 