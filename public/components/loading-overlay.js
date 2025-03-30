import { LitElement, html, css } from 'lit';

export class LoadingOverlay extends LitElement {
  static properties = {
    message: { type: String },
    active: { type: Boolean, reflect: true }
  };

  static styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      backdrop-filter: blur(4px);
      transition: all 0.3s ease;
      opacity: 0;
    }

    :host([active]) {
      display: flex;
      opacity: 1;
    }

    .loading-container {
      background-color: var(--card-bg, white);
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 200px;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 5px solid var(--gray-300, #e9ecef);
      border-top: 5px solid var(--primary, #5e7ce6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1.5rem;
    }

    .loading-text {
      font-size: 1.1rem;
      color: var(--text, #212529);
      font-weight: 500;
      font-family: var(--font-heading, sans-serif);
      text-align: center;
      margin-top: 0.5rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.message = 'Loading...';
    this.active = false;
  }

  show(message = null) {
    if (message) {
      this.message = message;
    }
    this.active = true;
    // Ensure the body doesn't scroll when overlay is active
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.active = false;
    // Restore scrolling
    document.body.style.overflow = '';
  }

  render() {
    return html`
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">${this.message}</div>
      </div>
    `;
  }
}

customElements.define('loading-overlay', LoadingOverlay);

// Make loading overlay globally available
window.addEventListener('DOMContentLoaded', () => {
  if (!window.loadingOverlay) {
    const overlay = document.createElement('loading-overlay');
    document.body.appendChild(overlay);
    window.loadingOverlay = overlay;
    
    // Define global show/hide methods for backward compatibility
    window.showLoadingOverlay = (message) => overlay.show(message);
    window.hideLoadingOverlay = () => overlay.hide();
  }
}); 