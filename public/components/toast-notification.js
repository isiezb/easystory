import { LitElement, html, css } from 'lit';

export class ToastNotification extends LitElement {
  static properties = {
    message: { type: String },
    type: { type: String }, // 'success', 'error', 'warning', 'info'
    duration: { type: Number },
    visible: { type: Boolean, reflect: true }
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .toast {
      position: relative;
      min-width: 300px;
      max-width: 400px;
      margin-bottom: 1rem;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      background: var(--card-bg, #fff);
      box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06));
      border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
    }

    :host([visible]) .toast {
      opacity: 1;
      transform: translateY(0);
    }

    .toast.success {
      border-left: 4px solid var(--success, #68d391);
    }
    
    .toast.error {
      border-left: 4px solid var(--error, #f56565);
    }
    
    .toast.warning {
      border-left: 4px solid var(--warning, #f6ad55);
    }
    
    .toast.info {
      border-left: 4px solid var(--primary, #5e7ce6);
    }

    .toast-content {
      display: flex;
      flex-direction: column;
      padding: 1rem;
    }

    .toast-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .toast-title {
      font-weight: 600;
      font-size: 1rem;
      margin-left: 0.5rem;
    }

    .toast-message {
      font-size: 0.875rem;
      color: var(--text-secondary, #6c757d);
      line-height: 1.5;
    }

    .toast-close {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: none;
      border: none;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }
  `;

  constructor() {
    super();
    this.message = '';
    this.type = 'info';
    this.duration = 5000;
    this.visible = false;
    this._timeoutId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Show toast when connected to DOM
    setTimeout(() => {
      this.visible = true;
    }, 50);

    // Auto-remove after duration
    if (this.duration > 0) {
      this._timeoutId = setTimeout(() => {
        this.close();
      }, this.duration);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }
  }

  close() {
    this.visible = false;
    // Remove from DOM after animation completes
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('toast-closed'));
    }, 300);
  }

  _getIconByType(type) {
    const icons = {
      error: '❌',
      success: '✅',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  render() {
    return html`
      <div class="toast ${this.type}">
        <div class="toast-content">
          <div class="toast-header">
            <span class="toast-icon">${this._getIconByType(this.type)}</span>
            <div class="toast-title">${this.type.charAt(0).toUpperCase() + this.type.slice(1)}</div>
          </div>
          <div class="toast-message">${this.message}</div>
        </div>
        <button class="toast-close" @click=${this.close} aria-label="Close">&times;</button>
      </div>
    `;
  }
}

customElements.define('toast-notification', ToastNotification); 