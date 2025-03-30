import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class ToastNotification extends LitElement {
  static get properties() {
    return {
      message: { type: String },
      type: { type: String },
      duration: { type: Number }
    };
  }

  constructor() {
    super();
    this.message = '';
    this.type = 'info'; // info, success, error, warning
    this.duration = 3000; // milliseconds
    this._timeoutId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._startAutoHideTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearAutoHideTimer();
  }

  _startAutoHideTimer() {
    if (this.duration > 0) {
      this._timeoutId = setTimeout(() => {
        this.remove();
      }, this.duration);
    }
  }

  _clearAutoHideTimer() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  _handleClose() {
    this._clearAutoHideTimer();
    this.remove();
  }

  static get styles() {
    return css`
      :host {
        display: block;
        margin-bottom: 0.5rem;
        transform: translateX(100%);
        animation: slide-in 0.3s forwards;
      }
      
      @keyframes slide-in {
        100% { transform: translateX(0); }
      }
      
      .toast {
        display: flex;
        align-items: center;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        color: white;
        font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
        position: relative;
      }
      
      .toast.info {
        background-color: #3498db;
      }
      
      .toast.success {
        background-color: #2ecc71;
      }
      
      .toast.warning {
        background-color: #f39c12;
      }
      
      .toast.error {
        background-color: #e74c3c;
      }
      
      .icon {
        margin-right: 0.75rem;
        font-size: 1.25rem;
      }
      
      .message {
        flex: 1;
        font-size: 0.875rem;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: white;
        opacity: 0.7;
        cursor: pointer;
        font-size: 1rem;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        transition: opacity 0.2s;
      }
      
      .close-btn:hover {
        opacity: 1;
      }
      
      .toast.remove {
        animation: slide-out 0.3s forwards;
      }
      
      @keyframes slide-out {
        100% { transform: translateX(100%); }
      }
    `;
  }

  render() {
    const iconMap = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    return html`
      <div class="toast ${this.type}">
        <div class="icon">${iconMap[this.type] || iconMap.info}</div>
        <div class="message">${this.message}</div>
        <button @click=${this._handleClose} class="close-btn">✕</button>
      </div>
    `;
  }
}

customElements.define('toast-notification', ToastNotification); 