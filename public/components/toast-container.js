import { LitElement, html, css } from 'lit';
import './toast-notification.js';

export class ToastContainer extends LitElement {
  static properties = {
    toasts: { type: Array, state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    }
    
    toast-notification {
      margin-bottom: 10px;
      pointer-events: all;
    }
  `;

  constructor() {
    super();
    this.toasts = [];
    this._counter = 0;
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (success, error, warning, info)
   * @param {number} duration - How long to display the toast in ms
   * @returns {number} - The ID of the toast (can be used to remove it)
   */
  showToast(message, type = 'info', duration = 5000) {
    const id = this._counter++;
    
    this.toasts = [...this.toasts, {
      id,
      message,
      type,
      duration
    }];
    
    return id;
  }

  /**
   * Remove a toast by ID
   * @param {number} id - The ID of the toast to remove
   */
  removeToast(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }

  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to display the toast in ms
   */
  success(message, duration = 5000) {
    return this.showToast(message, 'success', duration);
  }

  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to display the toast in ms
   */
  error(message, duration = 5000) {
    return this.showToast(message, 'error', duration);
  }

  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to display the toast in ms
   */
  warning(message, duration = 5000) {
    return this.showToast(message, 'warning', duration);
  }

  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {number} duration - How long to display the toast in ms
   */
  info(message, duration = 5000) {
    return this.showToast(message, 'info', duration);
  }

  _handleToastClosed(event, toastId) {
    this.removeToast(toastId);
  }

  render() {
    return html`
      ${this.toasts.map(toast => html`
        <toast-notification
          .message=${toast.message}
          .type=${toast.type}
          .duration=${toast.duration}
          @toast-closed=${(e) => this._handleToastClosed(e, toast.id)}
        ></toast-notification>
      `)}
    `;
  }
}

customElements.define('toast-container', ToastContainer);

// Make the toast container globally available
window.addEventListener('DOMContentLoaded', () => {
  // If not already defined, create a global toast container
  if (!window.toastContainer) {
    const container = document.createElement('toast-container');
    document.body.appendChild(container);
    window.toastContainer = container;
  }
}); 